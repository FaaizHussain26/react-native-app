import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FilteredImage } from './FilteredImage';
import { FilterType } from '../constants/theme';
import { CARD_W_IN, CARD_H_IN, BORDER_IN, BOTTOM_IN, LOCATION, YEAR } from '../constants/postcard';

interface PostcardPreviewProps {
  uri: string | null;
  filter: FilterType;
  brightness: number;
  contrast?: number;
  saturation?: number;
  warmth?: number;
  width: number;
  orientation?: 'portrait' | 'landscape';
}

export const PostcardPreview = ({
  uri,
  filter,
  brightness,
  contrast,
  saturation,
  warmth,
  width,
  orientation = 'portrait',
}: PostcardPreviewProps) => {
  const aspect = orientation === 'landscape' ? CARD_W_IN / CARD_H_IN : CARD_H_IN / CARD_W_IN;
  const height = width * aspect;

  // Borders are a fixed real-world size relative to the card's short physical
  // side (CARD_W_IN), regardless of which screen dimension that maps to.
  const shortSide = orientation === 'landscape' ? height : width;
  const borderSide   = shortSide * (BORDER_IN / CARD_W_IN);
  const borderBottom = shortSide * (BOTTOM_IN / CARD_W_IN);

  const imageW = width - borderSide * 2;
  const imageH = height - borderSide - borderBottom;

  // Scale font the same way the rest of the card scales
  const fontSize     = Math.max(7, shortSide * (24 / (CARD_W_IN * 300)));
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
