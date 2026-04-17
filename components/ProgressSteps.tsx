import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';

interface ProgressStepsProps {
  currentStep: number;
}

const steps = [
  { num: 1, label: 'Start' },
  { num: 2, label: 'Upload' },
  { num: 3, label: 'Edit' },
  { num: 4, label: 'Review' },
  { num: 5, label: 'Pay & Print' },
];

export const ProgressSteps = ({ currentStep }: ProgressStepsProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {steps.map((step, idx) => (
          <View key={step.num} style={styles.stepWrapper}>
            {/* Step + label */}
            <View style={styles.stepColumn}>
              <View
                style={[
                  styles.circle,
                  step.num <= currentStep
                    ? styles.circleActive
                    : styles.circleInactive,
                ]}
              >
                {step.num < currentStep ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : (
                  <Text
                    style={[
                      styles.stepNum,
                      step.num <= currentStep
                        ? styles.stepNumActive
                        : styles.stepNumInactive,
                    ]}
                  >
                    {step.num}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  step.num <= currentStep
                    ? styles.labelActive
                    : styles.labelInactive,
                ]}
              >
                {step.label}
              </Text>
            </View>

            {/* Connector line */}
            {idx < steps.length - 1 && (
              <View
                style={[
                  styles.connector,
                  step.num < currentStep
                    ? styles.connectorActive
                    : styles.connectorInactive,
                ]}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  stepWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepColumn: {
    alignItems: 'center',
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    backgroundColor: COLORS.primary,
  },
  circleInactive: {
    backgroundColor: COLORS.gray100,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  stepNum: {
    fontSize: 13,
    fontWeight: '600',
  },
  stepNumActive: {
    color: COLORS.white,
  },
  stepNumInactive: {
    color: COLORS.muted,
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    whiteSpace: 'nowrap',
  } as never,
  labelActive: {
    color: COLORS.textPrimary,
  },
  labelInactive: {
    color: COLORS.muted,
  },
  connector: {
    width: 40,
    height: 2,
    marginBottom: 20,
    marginHorizontal: SPACING.sm,
  },
  connectorActive: {
    backgroundColor: COLORS.primary,
  },
  connectorInactive: {
    backgroundColor: COLORS.gray100,
  },
});
