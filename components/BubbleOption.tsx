import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

interface BubbleOptionProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  badge?: string;
  disabled?: boolean;
}

// Circular "bubble" radio button — used wherever a row of options should
// behave like a single-select group (only one bubble filled in at a time).
export const BubbleOption = ({ label, selected, onPress, badge, disabled }: BubbleOptionProps) => {
  return (
    <TouchableOpacity
      style={[styles.wrapper, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[styles.circle, selected ? styles.circleActive : styles.circleInactive]}>
        {selected && <View style={styles.dot} />}
      </View>
      <Text style={[styles.label, selected ? styles.labelActive : styles.labelInactive]}>
        {label}
      </Text>
      {badge && (
        <Text style={[styles.badge, selected && styles.badgeActive]}>{badge}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 6 },
  disabled: { opacity: 0.5 },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 9999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  circleInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: COLORS.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
  },
  label: { fontSize: 13, fontWeight: '500' },
  labelActive: { color: COLORS.textPrimary, fontWeight: '700' },
  labelInactive: { color: COLORS.muted },
  badge: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.primary,
  },
  badgeActive: {
    color: COLORS.primary,
  },
});
