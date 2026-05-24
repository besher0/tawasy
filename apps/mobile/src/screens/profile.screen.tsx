import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../components/screen-container';
import { useAuth } from '../context/auth-context';
import theme from '../theme';
import { roleLabel } from '../lib/labels';

export function ProfileScreen() {
  const { user } = useAuth();

  return (
    <ScreenContainer>
      <Text style={styles.heading}>الملف الشخصي</Text>
      <View style={styles.card}>
        <Text style={styles.label}>الاسم</Text>
        <Text style={styles.value}>{user?.name}</Text>

        <Text style={styles.label}>الهاتف</Text>
        <Text style={styles.value}>{user?.phone}</Text>

        <Text style={styles.label}>الدور</Text>
        <Text style={styles.value}>{roleLabel(user?.role)}</Text>

        <Text style={styles.label}>معرّف الفرع</Text>
        <Text style={styles.value}>{user?.shopId ?? '-'}</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heading: { ...theme.typography.heading, color: theme.colors.onSurface, textAlign: 'right' },
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  label: { ...theme.typography.label, color: theme.colors.onSurfaceVariant, textAlign: 'right' },
  value: { ...theme.typography.body, color: theme.colors.onSurface, textAlign: 'right' },
});
