import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import theme from '../theme';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
}

export function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    padding: theme.spacing.lg,
    gap: 6,
  },
  title: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
  },
  value: {
    ...theme.typography.heading,
    color: theme.colors.onSurface,
  },
  subtitle: {
    ...theme.typography.label,
    color: theme.colors.primary,
  },
});