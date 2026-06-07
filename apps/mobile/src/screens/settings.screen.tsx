import React from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenContainer } from '../components/screen-container';
import { useAuth } from '../context/auth-context';
import { API_BASE_URL } from '../lib/api';
import theme from '../theme';

export function SettingsScreen() {
  const { logout } = useAuth();

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      void logout();
      return;
    }

    Alert.alert('تأكيد الخروج', 'هل تريد تسجيل الخروج من الجلسة الحالية؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تسجيل الخروج',
        style: 'destructive',
        onPress: () => {
          void logout();
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <Text style={styles.heading}>الإعدادات</Text>
      <View style={styles.card}>
        <Text style={styles.label}>رابط الخادم</Text>
        <Text style={styles.value}>{API_BASE_URL}</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>تسجيل الخروج</Text>
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
