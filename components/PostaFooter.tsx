import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';

const PostaFooter = () => {
  return (
    <View style={styles.footer}>
      <Text style={styles.leftText}>© 2025 Posta. All rights reserved.</Text>

      <Image
        source={require('../assets/images/posta-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.rightText}>Need help? Ask a staff member</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftText: {
    color: 'rgba(243, 238, 231, 0.9)',
    fontSize: 13,
    flex: 1,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  rightText: {
    color: 'rgba(243, 238, 231, 0.9)',
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
  },
});

export default PostaFooter;
