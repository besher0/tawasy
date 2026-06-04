import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScreenContainer } from '../components/screen-container';
import theme from '../theme';
import { useAuth } from '../context/auth-context';

export function LoginScreen() {
  const { login } = useAuth();
  const [phone, setPhone] = useState('0500000002');
  const [password, setPassword] = useState('12345678');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    try {
      setSubmitting(true);
      await login(phone, password);
    } catch {
      Alert.alert('ظپط´ظ„ طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„', 'طھط­ظ‚ظ‚ ظ…ظ† ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ ط£ظˆ ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <Text style={styles.title}>SugarPrecision</Text>
      <Text style={styles.subtitle}>طھط³ط¬ظٹظ„ ط¯ط®ظˆظ„ ظپط±ظٹظ‚ ط§ظ„ط¥ظ†طھط§ط¬</Text>

      <View style={styles.formCard}>
        <Text style={styles.label}>ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <Text style={styles.label}>ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={submit} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? 'ط¬ط§ط±ظٹ ط§ظ„ط¯ط®ظˆظ„...' : 'ط¯ط®ظˆظ„'}</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.display,
    color: theme.colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  formCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceContainerLowest,
    paddingHorizontal: theme.spacing.md,
    textAlign: 'right',
  },
  button: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    height: 48,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...theme.typography.title,
    color: theme.colors.onPrimary,
  },
});
