import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import PostaFooter from '../../components/PostaFooter';
import { PostcardPreview } from '../../components/PostcardPreview';
import { PrinterIllustration } from '../../components/PrinterIllustration';
import { useCropStore } from '../../stores/cropStore';
import { API_BASE_URL } from '../../services/api';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW } = Dimensions.get('window');
const CARD_W = Math.min(SW * 0.18, 220);

export default function PrintScreen() {
  const router = useRouter();
  const { session: sessionId = '' } = useLocalSearchParams<{ session: string }>();

  const { croppedImage, brightness, selectedFilter, orientation, resetAll } = useCropStore();

  const imageUrl =
    croppedImage ||
    (sessionId ? `${API_BASE_URL}/session/${sessionId}/image` : null);

  const [countdown, setCountdown] = useState(10);

  const handleNewOrder = async () => {
    resetAll();
    await AsyncStorage.removeItem('lastSessionId');
    router.replace('/');
  };

  useEffect(() => {
    if (countdown <= 0) {
      handleNewOrder();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/images/background-pattern.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.content}>
          {/* Header */}
          <Text style={styles.title}>Your postcard is printing!</Text>
          <Text style={styles.subtitle}>
            Your postcard will be ready here shortly,{'\n'}head over to the front desk to pick it up!
          </Text>

          {/* Printer illustration */}
          <PrinterIllustration width={280} height={220} />

          {/* Postcard preview */}
          <View style={styles.postcardCard}>
            <PostcardPreview
              uri={imageUrl}
              filter={selectedFilter}
              brightness={brightness}
              width={CARD_W}
              orientation={orientation}
            />
          </View>

          {/* Thank you + logo */}
          <View style={styles.thankRow}>
            <Text style={styles.thankText}>Thank you</Text>
            <Image
              source={require('../../assets/images/posta-logo.png')}
              style={styles.postaLogo}
              resizeMode="contain"
            />
          </View>

          {/* Countdown */}
          <Text style={styles.countdownText}>
            Returning to home in {countdown}s
          </Text>

          {/* CTA */}
          <TouchableOpacity style={styles.newOrderBtn} onPress={handleNewOrder}>
            <Text style={styles.newOrderText}>Print Another Postcard</Text>
          </TouchableOpacity>
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
    gap: SPACING.md,
    paddingTop: SPACING.lg,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: 'center',
    maxWidth: 500,
    lineHeight: 24,
  },
  postcardCard: {
    ...SHADOW.md,
  },
  thankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  thankText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  postaLogo: {
    width: 80,
    height: 28,
  },
  countdownText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  newOrderBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    height: 48,
    paddingHorizontal: SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    ...SHADOW.sm,
  },
  newOrderText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 15,
  },
});
