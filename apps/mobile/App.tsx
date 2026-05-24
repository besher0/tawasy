import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/auth-context';
import { AppNavigator } from './src/navigation/app-navigator';
import { usePushRegistration } from './src/hooks/use-push-registration';

function PushRegistrationBinder() {
  const { user } = useAuth();
  usePushRegistration(Boolean(user));
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <PushRegistrationBinder />
      <AppNavigator />
    </AuthProvider>
  );
}
