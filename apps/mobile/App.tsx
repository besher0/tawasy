import 'react-native-gesture-handler';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import { AuthProvider, useAuth } from './src/context/auth-context';
import { AppNavigator } from './src/navigation/app-navigator';
import { usePushRegistration } from './src/hooks/use-push-registration';

function PushRegistrationBinder() {
  const { user } = useAuth();
  usePushRegistration(Boolean(user));
  return null;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0a6fb8" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <PushRegistrationBinder />
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6fbff',
  },
});

