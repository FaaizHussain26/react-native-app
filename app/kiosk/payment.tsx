import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import * as Print from 'expo-print';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ProgressSteps } from '../../components/ProgressSteps';
import PostaFooter from '../../components/PostaFooter';
import { useCropStore } from '../../stores/cropStore';
import { usePrinterStore } from '../../stores/printerStore';
import IdleModal from '../../components/IdleModal';
import useIdleActivity from '../../hooks/useIdleActivity';
import { API_BASE_URL } from '../../services/api';
import { notifyPrintStatus } from '../../services/session';
import {
  COLORS,
  SPACING,
  RADIUS,
  SHADOW,
  buildCssFilter,
} from '../../constants/theme';
import {
  BORDER_IN,
  BOTTOM_IN,
  CARD_W_IN,
  CARD_H_IN,
  LOCATION,
  YEAR,
  CAPTION_MAX_WIDTH_RATIO,
  fitCaptionFontSizePt,
} from '../../constants/postcard';

const { width: SW, height: SH } = Dimensions.get('window');
const CARD_HAND_W = Math.min(SW * 0.24, 300);
const CARD_HAND_H = CARD_HAND_W * (220 / 280);
const PRICE_CARD_W = Math.min(SW * 0.22, 280);
// Keep the whole stack comfortably within the shorter dimension so nothing
// ever needs to scroll, even on smaller iPads.
const CONTENT_GAP = Math.min(SPACING.xl, SH * 0.025);

export default function PaymentScreen() {
  const router = useRouter();
  const { session: sessionId = '' } = useLocalSearchParams<{ session: string }>();

  const { brightness, contrast, saturation, warmth, selectedFilter, croppedImage, cropRect, orientation, resetAll } = useCropStore();
  const { printer, setPrinter } = usePrinterStore();

  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState('');

  const { showModal, resetIdleTimer } = useIdleActivity(
    () => {
      resetAll();
      router.replace('/');
    },
    // Longer than the app default (45s/20s) since this is the highest-stakes
    // screen to get silently bounced from mid-payment/print.
    { enabled: !isPrinting, idleModalMs: 90_000, redirectMs: 30_000 },
  );

  const imageUrl =
    croppedImage ||
    (sessionId ? `${API_BASE_URL}/session/${sessionId}/image` : '');

  const handleBack = () => {
    router.push(`/kiosk/review?session=${sessionId}`);
  };

  // ── Native AirPrint ──
  // First print of the app session asks the user to pick a printer
  // (Print.selectPrinterAsync) and remembers it in usePrinterStore, so every
  // print after that reuses the saved printer.url and skips the picker.
  const handlePrint = useCallback(async () => {
    setIsPrinting(true);
    setPrintError('');
    try {
      let activePrinter = printer;
      if (!activePrinter) {
        activePrinter = await Print.selectPrinterAsync();
        setPrinter(activePrinter);
      }

      // expo-print renders this HTML in a WKWebView whose file-URL sandbox is
      // locked to the app bundle, so a local file:// URI (the cropped image,
      // which lives in Caches) silently fails to load as an <img> subresource
      // and prints blank. Inline it as a data URI instead; the remote
      // http(s) fallback loads fine as-is and doesn't need this.
      const isLandscape = orientation === 'landscape';

      // Landscape used to be done by rotating the whole card with a CSS
      // transform inside the portrait sheet. That kept cropping, and the
      // reason is structural: the rotated card's LAYOUT box is CARD_H_IN
      // (6in) wide inside a CARD_W_IN (4.25in) page. A transform moves the
      // painted result but not the layout, so the document stayed wider than
      // the page and UIViewPrintFormatter — which sizes the print from the
      // content box, not from what's painted — fit that oversized box onto
      // the sheet and cut the rest. No amount of clipping fixed it.
      //
      // So there is no transform any more. The photo is rotated as a real
      // image, and the card is laid out directly in the sheet's own portrait
      // coordinates, using exactly the structure that already prints
      // correctly in portrait. Rotating the card 90deg clockwise maps its
      // edges onto the sheet like this:
      //
      //   card top border (0.5in)     -> sheet RIGHT  (0.5in)
      //   card bottom/caption (0.75in)-> sheet LEFT   (0.75in)
      //   card left border (0.5in)    -> sheet TOP    (0.5in)
      //   card right border (0.5in)   -> sheet BOTTOM (0.5in)
      //
      // leaving an image slot of 3in x 5in on the sheet — which is the 5x3
      // landscape slot turned on its side, so the rotated photo drops into it
      // with nothing to crop. The caption sits in the left band and is turned
      // with writing-mode rather than a transform, so it has no layout box to
      // overflow either.
      let printSourceUri = croppedImage;
      if (!printSourceUri) {
        // expo-print's WebView can't reliably pull a remote <img> in time, so
        // the photo is always inlined as a data URI — which means it always
        // has to be a local file first.
        const dest = `${FileSystem.cacheDirectory}print_src_${Date.now()}.jpg`;
        const download = await FileSystem.downloadAsync(imageUrl, dest);
        printSourceUri = download.uri;
      }
      if (isLandscape) {
        const rotated = await ImageManipulator.manipulateAsync(
          printSourceUri,
          [{ rotate: 90 }],
          { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG },
        );
        printSourceUri = rotated.uri;
      }
      const printImageSrc = `data:image/jpeg;base64,${await new File(printSourceUri).base64()}`;

      const cssFilter = buildCssFilter(selectedFilter, { brightness, contrast, saturation, warmth });

      // The media size never changes: it stays CARD_W_IN x CARD_H_IN, which is
      // the exact user-defined form the operator registered on the printer.
      // Asking for a swapped 6 x 4.25 sheet (or setting the print job's
      // orientation flag) makes the Epson driver hunt for a 6in-wide source it
      // doesn't have and fall back to its CD/DVD tray template — the printer
      // then prompts for the CD tray instead of pulling from the rear feed.
      const pageWidthIn = isLandscape ? CARD_H_IN : CARD_W_IN;
      const pageHeightIn = isLandscape ? CARD_W_IN : CARD_H_IN;
      const imageWidthIn = pageWidthIn - BORDER_IN * 2;
      const captionText = `${LOCATION} · ${YEAR}`;
      // fitCaptionFontSizePt sizes the caption to fill the border width it's
      // allowed; on the printed card that reads too large, so it goes out at
      // half. Letter spacing is derived below and scales with it.
      const CAPTION_PRINT_SCALE = 0.5;
      const captionFontSizePt =
        fitCaptionFontSizePt(captionText, imageWidthIn * CAPTION_MAX_WIDTH_RATIO) *
        CAPTION_PRINT_SCALE;
      const captionLetterSpacingPt = captionFontSizePt * 0.1;

      const imageBlock = `<div class="image-area"><img src="${printImageSrc}" alt="Postcard" /></div>`;
      const captionBlock = isLandscape
        ? `<div class="caption"><span>${captionText}</span></div>`
        : `<div class="caption">${captionText}</div>`;

      const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Posta Postcard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 100%; height: 100%;
    background: white;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .postcard {
    width: 100%; height: 100%;
    padding: ${
      isLandscape
        ? `${BORDER_IN}in ${BORDER_IN}in ${BORDER_IN}in 0`
        : `${BORDER_IN}in ${BORDER_IN}in 0 ${BORDER_IN}in`
    };
    display: flex;
    flex-direction: ${isLandscape ? 'row' : 'column'};
  }
  .image-area {
    flex: 1; min-width: 0; min-height: 0; overflow: hidden;
  }
  .image-area img {
    width: 100%; height: 100%;
    object-fit: cover;
    display: block;
    filter: ${cssFilter};
  }
  .caption {
    ${isLandscape ? `width: ${BOTTOM_IN}in;` : `height: ${BOTTOM_IN}in;`}
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #5A5248;
    font-size: ${captionFontSizePt}pt;
    letter-spacing: ${captionLetterSpacingPt}pt;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
  }${isLandscape ? `
  /* Turned with writing-mode, not a transform: this keeps the text's layout
     box inside the page the way a rotate() would not. */
  .caption span { writing-mode: vertical-rl; }` : ''}
  @page { margin: 0; size: ${CARD_W_IN}in ${CARD_H_IN}in; }
</style>
</head>
<body>
<div class="postcard">
  ${isLandscape ? captionBlock + imageBlock : imageBlock + captionBlock}
</div>
</body>
</html>`;

      // Always the portrait media size, and deliberately no `orientation` —
      // the rotation already happened in the HTML above. Every job the printer
      // sees is a plain 4.25 x 6in page from the rear feed,
      // whichever way the customer's postcard is turned.
      await Print.printAsync({
        html,
        printerUrl: activePrinter.url,
        width: CARD_W_IN * 72,
        height: CARD_H_IN * 72,
        orientation: Print.Orientation.portrait,
      });

      // Best-effort status ping — printing already happened on-device either way.
      notifyPrintStatus(sessionId, 'printed').catch(() => {});

      router.push(`/kiosk/print?session=${sessionId}`);
    } catch (err: any) {
      // User cancelled the printer picker or print sheet — not an error.
      if (err?.message?.includes('cancel')) {
        setIsPrinting(false);
        return;
      }
      console.error('Print failed:', err);
      setPrintError('Print failed. Please try again.');
      setIsPrinting(false);
      // Give the operator a fresh full idle window to read the error and
      // retry — otherwise a countdown that kept running (unseen) during a
      // native printer dialog could bounce them home almost immediately.
      resetIdleTimer();
    }
  }, [sessionId, selectedFilter, brightness, contrast, saturation, warmth, imageUrl, orientation, printer, setPrinter, router, resetIdleTimer]);


  return (
    <View
      style={styles.container}
      onStartShouldSetResponderCapture={() => {
        resetIdleTimer();
        return false;
      }}
    >
      <ImageBackground
        source={require('../../assets/images/background-pattern.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <ProgressSteps currentStep={5} />

        <View style={styles.content}>
          <Text style={styles.title}>Ready to Print</Text>
          <Text style={styles.subtitle}>
            Click the button below to print your postcard.
          </Text>

          {/* Decorative card-hand image */}
          <Image
            source={require('../../assets/images/card-hand.png')}
            style={[styles.cardHand, { width: CARD_HAND_W, height: CARD_HAND_H }]}
            resizeMode="contain"
          />

          {/* Price breakdown */}
          <View style={[styles.priceCard, { width: PRICE_CARD_W }]}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Postcard</Text>
              <Text style={styles.priceValue}>$3.50</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tax</Text>
              <Text style={styles.priceValue}>$0.43</Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>$3.93</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.printBtn, isPrinting && styles.btnDisabled]}
              onPress={handlePrint}
              disabled={isPrinting}
            >
              {isPrinting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.printBtnText}>Pay and Print</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleBack}
              disabled={isPrinting}
            >
              <Text style={styles.backBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>

          {printError !== '' && (
            <Text style={styles.errorText}>{printError}</Text>
          )}
        </View>

        <PostaFooter />
      </ImageBackground>

      <IdleModal visible={showModal} onStayHere={resetIdleTimer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  background: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    gap: CONTENT_GAP,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.muted,
    fontWeight: '500',
  },
  cardHand: {},
  priceCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    gap: SPACING.sm,
    ...SHADOW.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: { color: COLORS.textSecondary, fontSize: 16 },
  priceValue: { color: COLORS.textPrimary, fontWeight: '600', fontSize: 16 },
  priceDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  totalLabel: { color: COLORS.primary, fontSize: 18, fontWeight: '700' },
  totalValue: { color: COLORS.primary, fontSize: 32, fontWeight: '800' },
  btnRow: {
    flexDirection: 'row',
    gap: SPACING.xl,
    alignItems: 'center',
  },
  printBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    height: 56,
    paddingHorizontal: SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 220,
    ...SHADOW.md,
  },
  btnDisabled: { opacity: 0.6 },
  printBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 17 },
  backBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    height: 56,
    paddingHorizontal: SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    minWidth: 150,
  },
  backBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 17 },
  errorText: { fontSize: 13, color: COLORS.destructive, textAlign: 'center' },
});
