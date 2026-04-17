import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Print from 'expo-print';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ProgressSteps } from '../../components/ProgressSteps';
import PostaFooter from '../../components/PostaFooter';
import { FilteredImage } from '../../components/FilteredImage';
import { useCropStore } from '../../stores/cropStore';
import { API_BASE_URL } from '../../services/api';
import { requestPrintWithImage } from '../../services/session';
import {
  COLORS,
  SPACING,
  RADIUS,
  SHADOW,
  FILTER_CSS,
} from '../../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW, height: SH } = Dimensions.get('window');
const PREVIEW_W = Math.min(SW * 0.22, 200);
const PREVIEW_H = PREVIEW_W * (420 / 285);

const USE_SERVER_PRINT =
  process.env.EXPO_PUBLIC_USE_SERVER_PRINT === 'true';

export default function PaymentScreen() {
  const router = useRouter();
  const { session: sessionId = '' } = useLocalSearchParams<{ session: string }>();

  const { croppedImage, brightness, selectedFilter, resetAll } = useCropStore();

  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState('');

  const viewShotRef = useRef<ViewShot>(null);

  const imageUrl =
    croppedImage ||
    (sessionId ? `${API_BASE_URL}/session/${sessionId}/image` : '');

  const cssFilter = `brightness(${brightness}%) ${FILTER_CSS[selectedFilter]}`;
  const imgH = PREVIEW_H - SPACING.lg * 4;

  const goHome = useCallback(async () => {
    resetAll();
    await AsyncStorage.removeItem('lastSessionId');
    router.replace('/');
  }, [resetAll, router]);

  const handleBack = () => {
    router.push(`/kiosk/review?session=${sessionId}`);
  };

  // ── Server-side CUPS printing ──
  const handleServerPrint = useCallback(async () => {
    setIsPrinting(true);
    setPrintError('');
    try {
      // Capture the rendered preview (with filters) as a base64 image
      if (!viewShotRef.current) throw new Error('View ref not ready');
      const uri = await (viewShotRef.current as any).capture();

      await requestPrintWithImage({
        sessionId,
        imageUri: uri,
        filterType: selectedFilter,
        brightness,
      });

      router.push(`/kiosk/print?session=${sessionId}`);
    } catch (err) {
      console.error('Server print failed:', err);
      setPrintError('Print failed. Please try again.');
      setIsPrinting(false);
    }
  }, [sessionId, selectedFilter, brightness, router]);

  // ── AirPrint via HTML ──
  const handleAirPrint = useCallback(async () => {
    setIsPrinting(true);
    setPrintError('');
    try {
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
    padding: 50px;
    display: flex;
    flex-direction: column;
  }
  .image-area {
    flex: 1; min-height: 0; overflow: hidden;
  }
  .image-area img {
    width: 100%; height: 100%;
    object-fit: contain;
    display: block;
    filter: ${cssFilter};
  }
  @page { margin: 0; size: 4.25in 6in; }
</style>
</head>
<body>
<div class="postcard">
  <div class="image-area">
    <img src="${imageUrl}" alt="Postcard" />
  </div>
</div>
</body>
</html>`;

      await Print.printAsync({ html });
      goHome();
    } catch (err: any) {
      // User cancelled print — treat as success (don't show error)
      if (err?.message?.includes('cancel')) {
        setIsPrinting(false);
        return;
      }
      console.error('AirPrint failed:', err);
      setPrintError('Print failed. Please try again.');
      setIsPrinting(false);
    }
  }, [imageUrl, cssFilter, goHome]);

  const handlePrint = useCallback(() => {
    if (USE_SERVER_PRINT) {
      handleServerPrint();
    } else {
      handleAirPrint();
    }
  }, [handleServerPrint, handleAirPrint]);

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
            style={styles.cardHand}
            resizeMode="contain"
          />

          {/* Price breakdown */}
          <View style={styles.priceCard}>
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

        {/* Hidden ViewShot for capturing the preview */}
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'jpg', quality: 0.95 }}
          style={styles.hiddenShot}
        >
          <View
            style={[
              styles.previewCard,
              { width: PREVIEW_W, height: PREVIEW_H },
            ]}
          >
            <View style={[styles.previewImg, { height: imgH }]}>
              {imageUrl ? (
                <FilteredImage
                  uri={imageUrl}
                  filter={selectedFilter}
                  brightness={brightness}
                  width={PREVIEW_W - SPACING.md * 2}
                  height={imgH}
                />
              ) : null}
            </View>
            <View style={styles.previewLogoRow}>
              <Image
                source={require('../../assets/images/dbg-logo.png')}
                style={styles.dbgLogo}
                resizeMode="contain"
              />
            </View>
          </View>
        </ViewShot>

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
    gap: SPACING.lg,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: '500',
  },
  cardHand: {
    width: 280,
    height: 220,
  },
  priceCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    width: 240,
    gap: SPACING.xs,
    ...SHADOW.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: { color: COLORS.textSecondary, fontSize: 14 },
  priceValue: { color: COLORS.textPrimary, fontWeight: '600', fontSize: 14 },
  priceDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  totalLabel: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
  totalValue: { color: COLORS.primary, fontSize: 28, fontWeight: '800' },
  btnRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    alignItems: 'center',
  },
  printBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    height: 48,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
    ...SHADOW.md,
  },
  btnDisabled: { opacity: 0.6 },
  printBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  backBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    height: 48,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    minWidth: 120,
  },
  backBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },
  errorText: { fontSize: 13, color: COLORS.destructive, textAlign: 'center' },
  hiddenShot: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 0,
  },
  previewCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewImg: {
    width: '100%',
    overflow: 'hidden',
  },
  previewLogoRow: { alignItems: 'center', marginTop: SPACING.sm },
  dbgLogo: { width: 40, height: 40 },
});
