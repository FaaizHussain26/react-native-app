import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ProgressSteps } from '../../components/ProgressSteps';
import PostaFooter from '../../components/PostaFooter';
import { PostcardPreview } from '../../components/PostcardPreview';
import { useCropStore } from '../../stores/cropStore';
import { API_BASE_URL } from '../../services/api';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../constants/theme';

const { width: SW } = Dimensions.get('window');
const CARD_W = Math.min(SW * 0.34, 360);
const CARD_H = CARD_W * (6 / 4.25);

export default function ReviewScreen() {
  const router = useRouter();
  const { session: sessionId = '' } = useLocalSearchParams<{ session: string }>();

  const { croppedImage, brightness, contrast, saturation, warmth, selectedFilter } = useCropStore();

  const imageUrl =
    croppedImage ||
    (sessionId ? `${API_BASE_URL}/session/${sessionId}/image` : '');

  const handleProceedToPayment = () => {
    router.push(`/kiosk/payment?session=${sessionId}`);
  };

  const handleBack = () => {
    router.push(`/kiosk/edit?session=${sessionId}`);
  };

  return (
    <View style={styles.container}>
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
                <Image
                  source={require('../../assets/images/back-side-1.png')}
                  style={{ width: CARD_W, height: CARD_H }}
                  resizeMode="stretch"
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
                  width={CARD_W}
                />
              </View>
            </View>

            {/* Action panel */}
            <View style={styles.panel}>
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
  postcard: {
    overflow: 'hidden',
    ...SHADOW.md,
  },
  postcardFront: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
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
    flex: 1,
    maxWidth: 400,
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
