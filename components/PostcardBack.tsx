import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

interface PostcardBackProps {
  width: number;
  height: number;
  orientation?: 'portrait' | 'landscape';
}

// Renders the standard postcard-back layout (message lines, center divider,
// stamp box, address lines) from Views instead of stretching a single
// portrait-shaped raster image — so it stays correct at any aspect ratio,
// including landscape, instead of distorting.
export const PostcardBack = ({ width, height, orientation = 'portrait' }: PostcardBackProps) => {
  const pad = Math.max(10, Math.min(width, height) * 0.06);
  const dividerX = width * 0.58;
  const messageLineCount = orientation === 'landscape' ? 3 : 5;
  const messageAreaW = dividerX - pad * 2;
  const addressAreaW = width - dividerX - pad * 2;
  const stampSize = Math.min(addressAreaW * 0.85, height * 0.22);

  return (
    <View style={[styles.card, { width, height, padding: pad }]}>
      {/* Message lines (left) */}
      <View style={[styles.messageArea, { width: messageAreaW }]}>
        {Array.from({ length: messageLineCount }).map((_, i) => (
          <View key={i} style={styles.messageLine} />
        ))}
      </View>

      {/* Center divider */}
      <View style={[styles.divider, { left: dividerX }]} />

      {/* Stamp + address (right) */}
      <View style={[styles.addressArea, { left: dividerX + pad, width: addressAreaW }]}>
        <View style={[styles.stampBox, { width: stampSize, height: stampSize * 1.2 }]} />
        <View style={styles.addressLines}>
          <View style={[styles.addressLine, { width: '90%' }]} />
          <View style={[styles.addressLine, { width: '75%' }]} />
          <View style={[styles.addressLine, { width: '85%' }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    position: 'relative',
  },
  messageArea: {
    gap: 14,
  },
  messageLine: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  divider: {
    position: 'absolute',
    top: '10%',
    bottom: '10%',
    width: 1,
    backgroundColor: COLORS.border,
  },
  addressArea: {
    position: 'absolute',
    top: '8%',
    bottom: '8%',
    justifyContent: 'space-between',
  },
  stampBox: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 4,
  },
  addressLines: {
    gap: 16,
  },
  addressLine: {
    height: 1,
    backgroundColor: COLORS.border,
  },
});
