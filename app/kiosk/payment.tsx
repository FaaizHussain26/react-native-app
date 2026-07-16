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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ProgressSteps } from '../../components/ProgressSteps';
import PostaFooter from '../../components/PostaFooter';
import { useCropStore } from '../../stores/cropStore';
import { usePrinterStore } from '../../stores/printerStore';
import { API_BASE_URL } from '../../services/api';
import { notifyPrintStatus } from '../../services/session';
import {
  COLORS,
  SPACING,
  RADIUS,
  SHADOW,
  buildCssFilter,
} from '../../constants/theme';
import { BORDER_IN, BOTTOM_IN, LOCATION, YEAR } from '../../constants/postcard';

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

  const { brightness, contrast, saturation, warmth, selectedFilter, croppedImage } = useCropStore();
  const { printer, setPrinter, clearPrinter } = usePrinterStore();

  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState('');

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

      const cssFilter = buildCssFilter(selectedFilter, { brightness, contrast, saturation, warmth });
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
    font-size: 14pt;
    letter-spacing: 2pt;
    text-align: center;
  }
  @page { margin: 0; size: 4.25in 6in; }
</style>
</head>
<body>
<div class="postcard">
  <div class="image-area">
    <img src="${imageUrl}" alt="Postcard" />
  </div>
  <div class="caption">${LOCATION} · ${YEAR}</div>
</div>
</body>
</html>`;

      await Print.printAsync({ html, printerUrl: activePrinter.url });

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
    }
  }, [sessionId, selectedFilter, brightness, contrast, saturation, warmth, imageUrl, printer, setPrinter, router]);


  return (
    <View style={styles.container}>
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

          {printer && (
            <TouchableOpacity onPress={clearPrinter} disabled={isPrinting}>
              <Text style={styles.changePrinterText}>
                Printer: {printer.name} · Change
              </Text>
            </TouchableOpacity>
          )}

          {printError !== '' && (
            <Text style={styles.errorText}>{printError}</Text>
          )}
        </View>

        <PostaFooter />
      </ImageBackground>
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
  changePrinterText: {
    fontSize: 12,
    color: COLORS.muted,
    textDecorationLine: 'underline',
  },
});
