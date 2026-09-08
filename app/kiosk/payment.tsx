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

  const { brightness, contrast, saturation, warmth, selectedFilter, croppedImage, orientation, resetAll } = useCropStore();
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
      const printImageSrc = croppedImage
        ? `data:image/jpeg;base64,${await new File(croppedImage).base64()}`
        : imageUrl;

      const cssFilter = buildCssFilter(selectedFilter, { brightness, contrast, saturation, warmth });

      // The media size never changes: it stays CARD_W_IN x CARD_H_IN, which is
      // the exact user-defined form the operator registered on the printer.
      // Asking for a swapped 6 x 4.25 sheet (or setting the print job's
      // orientation flag) makes the Epson driver hunt for a 6in-wide source it
      // doesn't have and fall back to its CD/DVD tray template — the printer
      // then prompts for the CD tray instead of pulling from the rear feed.
      // So landscape is done entirely inside the page: lay the artwork out at
      // landscape dimensions and rotate it 90deg within the portrait sheet.
      const isLandscape = orientation === 'landscape';
      const contentWIn = isLandscape ? CARD_H_IN : CARD_W_IN;
      const contentHIn = isLandscape ? CARD_W_IN : CARD_H_IN;
      const pageWidthIn = orientation === 'landscape' ? CARD_H_IN : CARD_W_IN;
      const pageHeightIn = orientation === 'landscape' ? CARD_W_IN : CARD_H_IN;
      const imageWidthIn = pageWidthIn - BORDER_IN * 2;
      const captionText = `${LOCATION} · ${YEAR}`;
      const captionFontSizePt = fitCaptionFontSizePt(captionText, imageWidthIn * CAPTION_MAX_WIDTH_RATIO);
      const captionLetterSpacingPt = captionFontSizePt * 0.1;
      const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Posta Postcard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${CARD_W_IN}in; height: ${CARD_H_IN}in;
    position: relative;
    overflow: hidden;
    background: white;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* Centred on the sheet, sized to the artwork's own orientation, then
     rotated into place. A ${CARD_H_IN}x${CARD_W_IN}in box rotated 90deg
     covers the ${CARD_W_IN}x${CARD_H_IN}in sheet exactly. */
  .rotator {
    position: absolute;
    top: 50%; left: 50%;
    width: ${contentWIn}in; height: ${contentHIn}in;
    transform: translate(-50%, -50%) rotate(${isLandscape ? 90 : 0}deg);
  }
  .postcard {
    width: 100%; height: 100%;
    padding: ${BORDER_IN}in ${BORDER_IN}in 0 ${BORDER_IN}in;
    display: flex;
    flex-direction: column;
  }
  .image-area {
    flex: 1; min-height: 0; overflow: hidden;
  }
  .image-area img {
    width: 100%; height: 100%;
    object-fit: cover;
    display: block;
    filter: ${cssFilter};
  }
  .caption {
    height: ${BOTTOM_IN}in;
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
  }
  @page { margin: 0; size: ${CARD_W_IN}in ${CARD_H_IN}in; }
</style>
</head>
<body>
<div class="rotator">
  <div class="postcard">
    <div class="image-area">
      <img src="${printImageSrc}" alt="Postcard" />
    </div>
    <div class="caption">${LOCATION} · ${YEAR}</div>
  </div>
  <div class="caption">${captionText}</div>
</div>
</body>
</html>`;

      // Always the portrait media size, and deliberately no `orientation` —
      // the rotation already happened in the HTML above. Every job the printer
      // sees is a plain 4.25 x 6in page from the rear feed,
      // whichever way the customer's postcard is turned. See the .rotator note.
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
