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
import { Feather } from '@expo/vector-icons';
import { ProgressSteps } from '../../components/ProgressSteps';
import PostaFooter from '../../components/PostaFooter';
import { PostcardPreview } from '../../components/PostcardPreview';
import { useCropStore } from '../../stores/cropStore';
import { API_BASE_URL } from '../../services/api';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../constants/theme';

const { width: SW } = Dimensions.get('window');
const CARD_W = Math.min(SW * 0.26, 280);
const CARD_H = CARD_W * (6 / 4.25);

const CONDITIONS = [
  'High quality print',
  'Premium postcard paper',
  'Ready in minutes',
];

export default function ReviewScreen() {
  const router = useRouter();
  const { session: sessionId = '' } = useLocalSearchParams<{ session: string }>();

  const { croppedImage, brightness, selectedFilter } = useCropStore();

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
                  width={CARD_W}
                />
              </View>
            </View>

            {/* Action panel */}
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Ready to Print?</Text>

              {/* Conditions */}
              <View style={styles.conditions}>
                {CONDITIONS.map((c, i) => (
                  <View key={i} style={styles.conditionRow}>
                    <Feather name="check" size={16} color={COLORS.muted} />
                    <Text style={styles.conditionText}>{c}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.separator} />

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleProceedToPayment}
              >
                <Text style={styles.primaryBtnText}>Confirm and Pay</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={handleBack}>
                <Feather name="edit-2" size={15} color={COLORS.primary} />
                <Text style={styles.secondaryBtnText}>Edit Photo</Text>
              </TouchableOpacity>

              <View style={styles.disclaimer}>
                <Text style={styles.disclaimerText}>
                  By confirming, you agree that the preview accurately represents
                  your desired postcard.
                </Text>
              </View>
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
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  mainRow: {
    flexDirection: 'row',
    gap: SPACING.xl,
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 900,
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
    maxWidth: 360,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOW.md,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  conditions: { gap: SPACING.md },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  conditionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryBtn: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  secondaryBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  disclaimer: {
    backgroundColor: COLORS.miscLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disclaimerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
