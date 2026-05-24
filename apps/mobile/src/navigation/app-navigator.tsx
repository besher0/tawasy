import React from 'react';
import { ActivityIndicator, I18nManager } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/auth-context';
import theme from '../theme';
import { RootStackParamList } from './types';
import { LoginScreen } from '../screens/login.screen';
import { DashboardScreen } from '../screens/dashboard.screen';
import { IncomingOrdersScreen } from '../screens/incoming-orders.screen';
import { ProductionKanbanScreen } from '../screens/production-kanban.screen';
import { NewOrderScreen } from '../screens/new-order.screen';
import { NextDayEssentialsScreen } from '../screens/next-day-essentials.screen';
import { AnalyticsScreen } from '../screens/analytics.screen';
import { NotificationsScreen } from '../screens/notifications.screen';
import { OrderDetailsScreen } from '../screens/order-details.screen';
import { ProfileScreen } from '../screens/profile.screen';
import { SettingsScreen } from '../screens/settings.screen';
import { UserRole } from '@sugarprecision/shared-types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.surface,
    card: theme.colors.surfaceContainerLowest,
    text: theme.colors.onSurface,
    primary: theme.colors.primary,
    border: theme.colors.outlineVariant,
  },
};

function AppTabs() {
  const { user } = useAuth();

  const isFactory =
    user?.role === UserRole.ADMIN || user?.role === UserRole.FACTORY_MANAGER;

  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="Dashboard" component={DashboardScreen} />
      <Tabs.Screen name="Orders" component={IncomingOrdersScreen} />
      {isFactory ? (
        <Tabs.Screen name="Production" component={ProductionKanbanScreen} />
      ) : (
        <Tabs.Screen name="New Order" component={NewOrderScreen} />
      )}
      <Tabs.Screen name="Essentials" component={NextDayEssentialsScreen} />
      {isFactory ? (
        <Tabs.Screen name="Analytics" component={AnalyticsScreen} />
      ) : null}
      <Tabs.Screen name="Notifications" component={NotificationsScreen} />
    </Tabs.Navigator>
  );
}

export function AppNavigator() {
  const { loading, user } = useAuth();

  if (!I18nManager.isRTL) {
    I18nManager.allowRTL(true);
  }

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.colors.primary} />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator>
        {user ? (
          <>
            <Stack.Screen name="App" component={AppTabs} options={{ headerShown: false }} />
            <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} options={{ title: 'ط·ع¾ط¸ظ¾ط·آ§ط·آµط¸ظ¹ط¸â€‍ ط·آ§ط¸â€‍ط·آ·ط¸â€‍ط·آ¨' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'ط·آ§ط¸â€‍ط·آ¥ط·آ´ط·آ¹ط·آ§ط·آ±ط·آ§ط·ع¾' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'ط·آ§ط¸â€‍ط¸â€¦ط¸â€‍ط¸ظ¾ ط·آ§ط¸â€‍ط·آ´ط·آ®ط·آµط¸ظ¹' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'ط·آ§ط¸â€‍ط·آ¥ط·آ¹ط·آ¯ط·آ§ط·آ¯ط·آ§ط·ع¾' }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}