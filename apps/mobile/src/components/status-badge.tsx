import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import theme from '../theme';

interface StatusBadgeProps {
  label: string;
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'error';
}

const toneStyles = {
  neutral: { backgroundColor: theme.colors.surfaceContainer, color: theme.colors.onSurfaceVariant },
  primary: { backgroundColor: theme.colors.secondaryContainer, color: theme.colors.primary },
  success: { backgroundColor: '#d4f5ec', color: theme.colors.tertiary },
  warning: { backgroundColor: '#fef3c7', color: '#b45309' },
  error: { backgroundColor: theme.colors.errorContainer, color: theme.colors.error },
};

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: toneStyles[tone].backgroundColor }]}>
      <Text style={[styles.text, { color: toneStyles[tone].color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
  },
  text: {
    ...theme.typography.label,
    fontFamily: 'Cairo_700Bold',
  },
});
