import React from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenContainer } from '../components/screen-container';
import { useAuth } from '../context/auth-context';
import theme from '../theme';
import { roleLabel } from '../lib/labels';

export function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      void logout();
      return;
    }

    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج من الحساب؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تسجيل الخروج',
        style: 'destructive',
        onPress: () => void logout(),
      },
    ]);
  };

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

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color={theme.colors.onPrimary} />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
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
    gap: theme.spacing.sm,
  },
  label: { ...theme.typography.label, color: theme.colors.onSurfaceVariant, textAlign: 'right' },
  value: { ...theme.typography.body, color: theme.colors.onSurface, textAlign: 'right' },
  logoutButton: {
    height: 48,
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.error,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  logoutText: {
    ...theme.typography.title,
    color: theme.colors.onPrimary,
  },
});
