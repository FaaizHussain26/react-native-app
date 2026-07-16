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
import LottieView from 'lottie-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import PostaFooter from '../../components/PostaFooter';
import { PostcardPreview } from '../../components/PostcardPreview';
import { useCropStore } from '../../stores/cropStore';
import { API_BASE_URL } from '../../services/api';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../constants/theme';
import { CARD_FRAME } from '../../constants/postcard';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW } = Dimensions.get('window');
const CARD_W = Math.min(SW * 0.2, 240);

export default function PrintScreen() {
  const router = useRouter();
  const { session: sessionId = '' } = useLocalSearchParams<{ session: string }>();

  const { croppedImage, brightness, contrast, saturation, warmth, selectedFilter, resetAll } = useCropStore();

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
          {/* Title */}
          <View style={styles.titleArea}>
            <Text style={styles.title}>Your postcard is printing!</Text>
            <Text style={styles.subtitle}>
              Your postcard will be ready here shortly, head over to the front
              desk to pick it up!
            </Text>
          </View>

          {/* Printer animation */}
          <LottieView
            source={require('../../assets/printer-lottie.json')}
            autoPlay
            loop
            style={styles.printerAnimation}
          />

          {/* Postcard preview */}
          <View style={styles.postcardCard}>
            <PostcardPreview
              uri={imageUrl}
              filter={selectedFilter}
              brightness={brightness}
              contrast={contrast}
              saturation={saturation}
              warmth={warmth}
              width={CARD_W}
            />
          </View>

          {/* Thank you */}
          <View style={styles.thankYou}>
            <Text style={styles.thankYouText}>Thank you!</Text>
            <Image
              source={require('../../assets/images/posta-logo.png')}
              style={styles.thankYouLogo}
              resizeMode="contain"
            />
          </View>

          {/* CTA button */}
          <TouchableOpacity style={styles.newOrderBtn} onPress={handleNewOrder}>
            <Text style={styles.newOrderText}>Print Another Postcard</Text>
          </TouchableOpacity>

          <Text style={styles.countdownText}>
            Returning to home in {countdown}s
          </Text>
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
    gap: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  titleArea: { alignItems: 'center', gap: SPACING.xs },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: 'center',
    maxWidth: 480,
  },
  printerAnimation: {
    width: 220,
    height: 180,
  },
  postcardCard: {
    ...CARD_FRAME,
  },
  thankYou: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  thankYouText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  thankYouLogo: {
    width: 60,
    height: 60,
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
  countdownText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
});
