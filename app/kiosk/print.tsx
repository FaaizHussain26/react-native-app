import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
  LayoutChangeEvent,
  useWindowDimensions,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import PostaFooter from '../../components/PostaFooter';
import { PostcardPreview } from '../../components/PostcardPreview';
import { useCropStore } from '../../stores/cropStore';
import { API_BASE_URL } from '../../services/api';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../constants/theme';
import { CARD_FRAME, CARD_W_IN, CARD_H_IN } from '../../constants/postcard';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Widest the postcard is ever drawn, however much vertical room is going
// spare — beyond this it just looks oversized next to the rest of the stack.
const CARD_MAX_W = 240;
// CARD_FRAME's padding, on both sides — the postcard itself gets the slot
// minus this.
const CARD_FRAME_INSET = CARD_FRAME.padding * 2;

export default function PrintScreen() {
  const router = useRouter();
  const { height: SH } = useWindowDimensions();

  const CONTENT_GAP = Math.min(SPACING.lg, SH * 0.02);
  const ANIM_H = Math.min(150, SH * 0.18);
  const ANIM_W = ANIM_H * (220 / 180);

  const { session: sessionId = '' } = useLocalSearchParams<{ session: string }>();

  const { croppedImage, brightness, contrast, saturation, warmth, selectedFilter, orientation, resetAll } = useCropStore();

  const imageUrl =
    croppedImage ||
    (sessionId ? `${API_BASE_URL}/session/${sessionId}/image` : null);

  const [countdown, setCountdown] = useState(10);

  // The postcard used to be sized from screen *width* alone (SW * 0.2), which
  // ignored the vertical budget entirely: on a landscape iPad the stack came
  // to ~920pt inside ~750pt of content area, and because the column is
  // centred, RN pushed half that overflow off each end — slicing the title at
  // the top and taking the button and countdown off the bottom. It now gets
  // whatever height is left over after the fixed rows, measured rather than
  // predicted, so the stack always fits whatever the viewport turns out to be.
  const [cardSlot, setCardSlot] = useState({ width: 0, height: 0 });
  const onCardSlotLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCardSlot((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  };

  const card = useMemo(() => {
    const maxW = Math.min(cardSlot.width - CARD_FRAME_INSET, CARD_MAX_W);
    const maxH = cardSlot.height - CARD_FRAME_INSET;
    if (maxW <= 0 || maxH <= 0) return null;

    // Card width per unit of card height, for the orientation in play.
    const ratio =
      orientation === 'landscape' ? CARD_H_IN / CARD_W_IN : CARD_W_IN / CARD_H_IN;

    let height = maxH;
    let width = height * ratio;
    if (width > maxW) {
      width = maxW;
      height = width / ratio;
    }
    return { width, height };
  }, [cardSlot, orientation]);

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
        <View style={[styles.content, { gap: CONTENT_GAP }]}>
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
            style={{ width: ANIM_W, height: ANIM_H }}
          />

          {/* Postcard preview — takes the height the fixed rows leave over. */}
          <View style={styles.cardSlot} onLayout={onCardSlotLayout}>
            {card && (
              <View style={styles.postcardCard}>
                <PostcardPreview
                  uri={imageUrl}
                  filter={selectedFilter}
                  brightness={brightness}
                  contrast={contrast}
                  saturation={saturation}
                  warmth={warmth}
                  width={card.width}
                  height={card.height}
                  orientation={orientation}
                />
              </View>
            )}
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
    // Laid out from the top, not centred: the card slot below absorbs any
    // slack, so there is nothing left to centre — and if a very short
    // viewport ever did overflow, centring would hide the title off the top
    // edge instead of letting it run off the bottom.
    justifyContent: 'flex-start',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
  },
  titleArea: { alignItems: 'center', gap: SPACING.xs },
  cardSlot: {
    flex: 1,
    minHeight: 0,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
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
    width: 44,
    height: 44,
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
    marginVertical: SPACING.sm
  },
});
