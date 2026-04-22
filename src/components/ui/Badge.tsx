import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error';
}

const variantColors: Record<string, string> = {
  primary: colors.primary,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
};

export default function Badge({ label, variant = 'primary' }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: variantColors[variant] + '20' }]}>
      <Text style={[styles.text, { color: variantColors[variant] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600' },
});
