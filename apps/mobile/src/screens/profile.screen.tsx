import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../components/screen-container';
import { useAuth } from '../context/auth-context';
import theme from '../theme';

export function ProfileScreen() {
  const { user } = useAuth();

  return (
    <ScreenContainer>
      <Text style={styles.heading}>ط·آ§ط¸â€‍ط¸â€¦ط¸â€‍ط¸ظ¾ ط·آ§ط¸â€‍ط·آ´ط·آ®ط·آµط¸ظ¹</Text>
      <View style={styles.card}>
        <Text style={styles.label}>ط·آ§ط¸â€‍ط·آ§ط·آ³ط¸â€¦</Text>
        <Text style={styles.value}>{user?.name}</Text>

        <Text style={styles.label}>ط·آ§ط¸â€‍ط¸â€،ط·آ§ط·ع¾ط¸ظ¾</Text>
        <Text style={styles.value}>{user?.phone}</Text>

        <Text style={styles.label}>ط·آ§ط¸â€‍ط·آ¯ط¸ث†ط·آ±</Text>
        <Text style={styles.value}>{user?.role}</Text>

        <Text style={styles.label}>shopId</Text>
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