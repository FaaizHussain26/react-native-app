import React from 'react';
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
import { FilteredImage } from '../../components/FilteredImage';
import { useCropStore } from '../../stores/cropStore';
import { API_BASE_URL } from '../../services/api';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW } = Dimensions.get('window');
const CARD_W = Math.min(SW * 0.2, 240);
const CARD_H = CARD_W * (420 / 285);

export default function PrintScreen() {
  const router = useRouter();
  const { session: sessionId = '' } = useLocalSearchParams<{ session: string }>();

  const { croppedImage, brightness, selectedFilter, resetAll } = useCropStore();

  const imageUrl =
    croppedImage ||
    (sessionId ? `${API_BASE_URL}/session/${sessionId}/image` : '');

  const imgH = CARD_H - SPACING.lg * 3;

  const handleNewOrder = async () => {
    resetAll();
    await AsyncStorage.removeItem('lastSessionId');
    router.replace('/');
  };

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
          </View>

          {/* Decorative print background image */}
          <Image
            source={require('../../assets/images/print-bg.png')}
            style={styles.printBg}
            resizeMode="contain"
          />

          {/* Postcard preview */}
          <View
            style={[
              styles.postcardCard,
              { width: CARD_W, height: CARD_H },
            ]}
          >
            <View style={[styles.imageArea, { height: imgH }]}>
              {imageUrl ? (
                <FilteredImage
                  uri={imageUrl}
                  filter={selectedFilter}
                  brightness={brightness}
                  width={CARD_W - SPACING.md * 2}
                  height={imgH}
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                <View style={[styles.placeholder, { height: imgH }]} />
              )}
            </View>
            <View style={styles.logoRow}>
              <Image
                source={require('../../assets/images/dbg-logo.png')}
                style={styles.dbgLogo}
                resizeMode="contain"
              />
            </View>
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
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.md,
  },
  imageArea: {
    width: '100%',
    overflow: 'hidden',
  },
  placeholder: {
    width: '100%',
    backgroundColor: COLORS.gray100,
  },
  logoRow: { alignItems: 'center', marginTop: SPACING.sm },
  dbgLogo: { width: 42, height: 42 },
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
