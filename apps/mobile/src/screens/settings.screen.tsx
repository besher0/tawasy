import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenContainer } from '../components/screen-container';
import { useAuth } from '../context/auth-context';
import theme from '../theme';

export function SettingsScreen() {
  const { logout } = useAuth();

  return (
    <ScreenContainer>
      <Text style={styles.heading}>ط·آ§ط¸â€‍ط·آ¥ط·آ¹ط·آ¯ط·آ§ط·آ¯ط·آ§ط·ع¾</Text>
      <View style={styles.card}>
        <Text style={styles.label}>API Base URL</Text>
        <Text style={styles.value}>{process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000'}</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            Alert.alert('ط·ع¾ط·آ£ط¸ئ’ط¸ظ¹ط·آ¯', 'ط¸â€،ط¸â€‍ ط·ع¾ط·آ±ط¸ظ¹ط·آ¯ ط·ع¾ط·آ³ط·آ¬ط¸ظ¹ط¸â€‍ ط·آ§ط¸â€‍ط·آ®ط·آ±ط¸ث†ط·آ¬ط·ع؛', [
              { text: 'ط·آ¥ط¸â€‍ط·ط›ط·آ§ط·طŒ', style: 'cancel' },
              {
                text: 'ط·آ®ط·آ±ط¸ث†ط·آ¬',
                style: 'destructive',
                onPress: () => {
                  void logout();
                },
              },
            ]);
          }}
        >
          <Text style={styles.buttonText}>ط·ع¾ط·آ³ط·آ¬ط¸ظ¹ط¸â€‍ ط·آ§ط¸â€‍ط·آ®ط·آ±ط¸ث†ط·آ¬</Text>
        </TouchableOpacity>
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
    gap: theme.spacing.md,
  },
  label: { ...theme.typography.label, color: theme.colors.onSurfaceVariant, textAlign: 'right' },
  value: { ...theme.typography.body, color: theme.colors.onSurface, textAlign: 'right' },
  button: {
    height: 48,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  buttonText: { ...theme.typography.title, color: theme.colors.onPrimary },
});