import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FilteredImage } from './FilteredImage';
import { FilterType } from '../constants/theme';

// Physical postcard dimensions (inches)
const PORTRAIT_W = 4.25;
const PORTRAIT_H = 6;
const BORDER_SIDE   = 0.5;  // top, left, right
const BORDER_BOTTOM = 0.75; // bottom (holds text)

const LOCATION = (process.env.EXPO_PUBLIC_LOCATION_NAME ?? 'YOUR LOCATION').toUpperCase();
const YEAR     = new Date().getFullYear();

interface PostcardPreviewProps {
  uri: string | null;
  filter: FilterType;
  brightness: number;
  width: number;
  orientation?: 'portrait' | 'landscape';
}

export const PostcardPreview = ({
  uri,
  filter,
  brightness,
  width,
  orientation = 'portrait',
}: PostcardPreviewProps) => {
  // In landscape mode the physical card is rotated: 6in wide × 4.25in tall
  const cardWIn = orientation === 'landscape' ? PORTRAIT_H : PORTRAIT_W;
  const cardHIn = orientation === 'landscape' ? PORTRAIT_W : PORTRAIT_H;

  const height = width * (cardHIn / cardWIn);

  // Borders derived proportionally from card width (= cardWIn inches)
  const borderSide   = width * (BORDER_SIDE / cardWIn);
  const borderBottom = width * (BORDER_BOTTOM / cardWIn);

  const imageW = width - borderSide * 2;
  const imageH = height - borderSide - borderBottom;

  const fontSize      = Math.max(7, width * (24 / (cardWIn * 300)));
  const letterSpacing = fontSize * 0.12;

  return (
    <View style={[styles.card, { width, height }]}>
      <View style={{ paddingTop: borderSide, paddingHorizontal: borderSide }}>
        <View style={{ width: imageW, height: imageH, overflow: 'hidden' }}>
          {uri ? (
            <FilteredImage
              uri={uri}
              filter={filter}
              brightness={brightness}
              width={imageW}
              height={imageH}
              preserveAspectRatio="xMidYMid slice"
            />
          ) : (
            <View style={[styles.placeholder, { width: imageW, height: imageH }]} />
          )}
        </View>
      </View>

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
