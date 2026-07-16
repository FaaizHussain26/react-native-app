import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FilteredImage } from './FilteredImage';
import { FilterType } from '../constants/theme';

// Physical postcard dimensions (inches)
const CARD_W_IN   = 4.25;
const CARD_H_IN   = 6;
const BORDER_IN   = 0.5;   // top, left, right
const BOTTOM_IN   = 0.75;  // bottom border (thicker, holds text)

const LOCATION = (process.env.EXPO_PUBLIC_LOCATION_NAME ?? 'YOUR LOCATION').toUpperCase();
const YEAR     = new Date().getFullYear();

interface PostcardPreviewProps {
  uri: string | null;
  filter: FilterType;
  brightness: number;
  contrast?: number;
  saturation?: number;
  warmth?: number;
  width: number;
}

export const PostcardPreview = ({
  uri,
  filter,
  brightness,
  contrast,
  saturation,
  warmth,
  width,
}: PostcardPreviewProps) => {
  const height = width * (CARD_H_IN / CARD_W_IN);

  // All borders derived from width so proportions stay exact at any size
  const borderSide   = width * (BORDER_IN / CARD_W_IN);
  const borderBottom = width * (BOTTOM_IN / CARD_W_IN);

  const imageW = width - borderSide * 2;
  const imageH = height - borderSide - borderBottom;

  // Scale font the same way the rest of the card scales
  const fontSize     = Math.max(7, width * (24 / (CARD_W_IN * 300)));
  const letterSpacing = fontSize * 0.12;

  return (
    <View style={[styles.card, { width, height }]}>
      {/* Top + side borders are just padding around the image */}
      <View style={{ paddingTop: borderSide, paddingHorizontal: borderSide }}>
        <View style={{ width: imageW, height: imageH, overflow: 'hidden' }}>
          {uri ? (
            <FilteredImage
              uri={uri}
              filter={filter}
              brightness={brightness}
              contrast={contrast}
              saturation={saturation}
              warmth={warmth}
              width={imageW}
              height={imageH}
              preserveAspectRatio="xMidYMid slice"
            />
          ) : (
            <View style={[styles.placeholder, { width: imageW, height: imageH }]} />
          )}
        </View>
      </View>

      {/* Bottom border with location text */}
      <View style={[styles.bottomBorder, { height: borderBottom }]}>
        <Text style={[styles.locationText, { fontSize, letterSpacing }]}>
          {LOCATION} · {YEAR}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: '#E4E4E7',
  },
  bottomBorder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: {
    color: '#5A5248',
    fontWeight: '400',
    textAlign: 'center',
  },
});
