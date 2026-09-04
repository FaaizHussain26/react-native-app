import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ProgressSteps } from '../../components/ProgressSteps';
import PostaFooter from '../../components/PostaFooter';
import { PostcardPreview } from '../../components/PostcardPreview';
import { PostcardBack } from '../../components/PostcardBack';
import { useCropStore } from '../../stores/cropStore';
import IdleModal from '../../components/IdleModal';
import useIdleActivity from '../../hooks/useIdleActivity';
import { API_BASE_URL } from '../../services/api';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../constants/theme';
import { CARD_FRAME, CARD_W_IN, CARD_H_IN } from '../../constants/postcard';

const { width: SW, height: SH } = Dimensions.get('window');

// Reserve a fixed panel width so the space left for the two cards is a known
// budget — sizing cards off a single SHORT_SIDE/LONG_SIDE swap let landscape
// photos render ~300px wider than portrait ones and shove this panel off
// the right edge of the screen (flexDirection: 'row', no wrap, no h-scroll).
const PANEL_W = Math.min(SW * 0.26, 380);
const HORIZONTAL_PADDING = SPACING.xxl * 2; // scroll's paddingHorizontal, both sides
const ROW_GAP = SPACING.xxl; // gap between cardsRow and panel
const CARD_GAP = SPACING.lg; // gap between the two cards
const CHROME_H = 240; // ProgressSteps + PostaFooter + scroll vertical padding estimate

const MAX_CARD_W = (SW - HORIZONTAL_PADDING - PANEL_W - ROW_GAP - CARD_GAP) / 2;
const MAX_CARD_H = SH - CHROME_H;

export default function ReviewScreen() {
  const router = useRouter();
  const { session: sessionId = '' } = useLocalSearchParams<{ session: string }>();

  const { croppedImage, brightness, contrast, saturation, warmth, selectedFilter, orientation, resetAll } = useCropStore();

  const imageUrl =
    croppedImage ||
    (sessionId ? `${API_BASE_URL}/session/${sessionId}/image` : '');

  // Card width is capped by the same horizontal budget regardless of
  // orientation, so two cards + the panel always fit the screen; height
  // follows the postcard's real aspect ratio (swapped for landscape) and
  // shrinks naturally instead of the card ballooning wider.
  const aspectW_in = orientation === 'landscape' ? CARD_H_IN : CARD_W_IN;
  const aspectH_in = orientation === 'landscape' ? CARD_W_IN : CARD_H_IN;
  const CARD_W = Math.max(120, Math.min(MAX_CARD_W, MAX_CARD_H * (aspectW_in / aspectH_in)));
  const CARD_H = CARD_W * (aspectH_in / aspectW_in);

  const { showModal, resetIdleTimer } = useIdleActivity(() => {
    resetAll();
    router.replace('/');
  });

  const handleProceedToPayment = () => {
    router.push(`/kiosk/payment?session=${sessionId}`);
  };

  const handleBack = () => {
    router.push(`/kiosk/edit?session=${sessionId}`);
  };

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
        <ProgressSteps currentStep={4} />

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.mainRow}>
            {/* Postcards side by side */}
            <View style={styles.cardsRow}>
              {/* Back side */}
              <View
                style={[
                  styles.postcard,
                  { width: CARD_W, height: CARD_H },
                ]}
              >
                <PostcardBack
                  width={CARD_W - 16}
                  height={CARD_H - 16}
                  orientation={orientation}
                />
              </View>

              {/* Front side */}
              <View style={[styles.postcard, { width: CARD_W, height: CARD_H }]}>
                <PostcardPreview
                  uri={imageUrl || null}
                  filter={selectedFilter}
                  brightness={brightness}
                  contrast={contrast}
                  saturation={saturation}
                  warmth={warmth}
                  width={CARD_W - 16}
                  height={CARD_H - 16}
                  orientation={orientation}
                />
              </View>
            </View>

            {/* Action panel */}
            <View style={[styles.panel, { width: PANEL_W }]}>
              <Text style={styles.panelTitle}>Ready to Print?</Text>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleProceedToPayment}
              >
                <Text style={styles.primaryBtnText}>Confirm and Pay</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={handleBack}>
                <Text style={styles.secondaryBtnText}>Go back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <PostaFooter />
      </ImageBackground>

      <IdleModal visible={showModal} onStayHere={resetIdleTimer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  background: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainRow: {
    flexDirection: 'row',
    gap: SPACING.xxl,
    alignItems: 'stretch',
    width: '100%',
    maxWidth: 1100,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    alignItems: 'flex-start',
  },
  postcard: CARD_FRAME,
  imgArea: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgPlaceholder: {
    backgroundColor: COLORS.gray100,
    width: '100%',
  },
  logoRow: { alignItems: 'center', marginTop: SPACING.sm },
  dbgLogo: { width: 48, height: 48 },
  panel: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xxl,
    gap: SPACING.lg,
    justifyContent: 'center',
    ...SHADOW.md,
  },
  panelTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryBtn: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  secondaryBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 16,
  },
});
