import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOW } from '../constants/theme';

interface IdleModalProps {
  visible: boolean;
  onStayHere: () => void;
}

const IdleModal = ({ visible, onStayHere }: IdleModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Are you still there?</Text>
          <Text style={styles.body}>
            You&apos;ve been idle for a while. The app will return to the home
            screen shortly.
          </Text>
          <TouchableOpacity style={styles.button} onPress={onStayHere}>
            <Text style={styles.buttonText}>Stay Here</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xxl,
    width: 380,
    alignItems: 'center',
    ...SHADOW.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default IdleModal;
