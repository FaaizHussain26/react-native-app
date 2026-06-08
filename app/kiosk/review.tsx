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

export default function ReviewScreen() {
  const router = useRouter();
  const { session: sessionId = '' } = useLocalSearchParams<{ session: string }>();

  const { croppedImage, brightness, selectedFilter, orientation } = useCropStore();

  const imageUrl =
    croppedImage ||
    (sessionId ? `${API_BASE_URL}/session/${sessionId}/image` : '');

  const cardH =
    orientation === 'landscape'
      ? CARD_W * (4.25 / 6)
      : CARD_W * (6 / 4.25);

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
              <View style={[styles.postcard, { width: CARD_W, height: cardH }]}>
                <Image
                  source={require('../../assets/images/back-side-1.png')}
                  style={{ width: CARD_W, height: cardH }}
                  resizeMode="stretch"
                />
              </View>

              {/* Front side */}
              <View style={[styles.postcard, { width: CARD_W, height: cardH }]}>
                <PostcardPreview
                  uri={imageUrl || null}
                  filter={selectedFilter}
                  brightness={brightness}
                  width={CARD_W}
                  orientation={orientation}
                />
              </View>
            </View>

            {/* Action panel */}
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Ready to print</Text>

              <View style={styles.separator} />

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleProceedToPayment}
              >
                <Text style={styles.primaryBtnText}>Confirm and pay</Text>
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
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  mainRow: {
    flexDirection: 'row',
    gap: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 900,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    alignItems: 'center',
  },
  postcard: {
    overflow: 'hidden',
    ...SHADOW.md,
  },
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
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  secondaryBtnText: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
});
