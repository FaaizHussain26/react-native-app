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
import { useCropStore } from '../../stores/cropStore';
import { API_BASE_URL } from '../../services/api';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW } = Dimensions.get('window');
const CARD_W = Math.min(SW * 0.2, 240);

export default function PrintScreen() {
  const router = useRouter();
  const { session: sessionId = '' } = useLocalSearchParams<{ session: string }>();

  const { croppedImage, brightness, selectedFilter, resetAll } = useCropStore();

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
            <Text style={styles.title}>Your Memory is Taking Shape...</Text>
            <Text style={styles.subtitle}>
              Your postcard is printing now — pick it up at the front desk in
              just a moment!
            </Text>
            <Text style={styles.countdownText}>
              Returning to home in {countdown}s
            </Text>
          </View>

          {/* Decorative print background image */}
          <Image
            source={require('../../assets/images/print-bg.png')}
            style={styles.printBg}
            resizeMode="contain"
          />

          {/* Postcard preview */}
          <View style={styles.postcardCard}>
            <PostcardPreview
              uri={imageUrl}
              filter={selectedFilter}
              brightness={brightness}
              width={CARD_W}
            />
          </View>

          {/* CTA button */}
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
  printBg: {
    width: 300,
    height: 220,
    position: 'absolute',
    opacity: 0.4,
    top: '8%',
    left: '30%',
  },
  postcardCard: {
    ...SHADOW.md,
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
