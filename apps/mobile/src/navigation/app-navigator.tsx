import React from 'react';
import { ActivityIndicator, I18nManager, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  BottomTabBar,
  BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
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

const TAB_LABELS: Record<string, string> = {
  Dashboard: 'لوحة التحكم',
  Orders: 'الطلبات',
  Production: 'الإنتاج',
  'New Order': 'طلب جديد',
  Essentials: 'مستلزمات الغد',
  Analytics: 'التحليلات',
  Notifications: 'الإشعارات',
  Settings: 'الإعدادات',
};

const TAB_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Dashboard: 'dashboard',
  Orders: 'shopping-cart',
  Production: 'factory',
  'New Order': 'add-shopping-cart',
  Essentials: 'inventory',
  Analytics: 'analytics',
  Notifications: 'notifications',
  Settings: 'settings',
};

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

function WebTabBar(props: BottomTabBarProps) {
  const { state, descriptors, navigation } = props;

  if (Platform.OS !== 'web') {
    return <BottomTabBar {...props} />;
  }

  return (
    <>
      <View style={styles.webHeader}>
        <View style={styles.webHeaderActions}>
          <MaterialIcons name="notifications" size={22} color={theme.colors.onSurfaceVariant} />
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={22} color={theme.colors.onPrimary} />
          </View>
        </View>
        <Text style={styles.webSearch}>بحث عن الطلبات...</Text>
      </View>

      <View style={styles.webSidebar}>
        <View style={styles.brandBlock}>
          <View style={styles.brandIcon}>
            <MaterialIcons name="factory" size={22} color={theme.colors.onPrimary} />
          </View>
          <View>
            <Text style={styles.brandTitle}>SugarPrecision</Text>
            <Text style={styles.brandSubtitle}>إدارة الإنتاج</Text>
          </View>
        </View>

        <View style={styles.webNav}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const label = TAB_LABELS[route.name] ?? route.name;
            const iconName = TAB_ICONS[route.name] ?? 'circle';

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                style={[styles.webNavItem, focused ? styles.webNavItemActive : null]}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });

                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
              >
                <MaterialIcons
                  name={iconName}
                  size={21}
                  color={focused ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
                <Text style={[styles.webNavLabel, focused ? styles.webNavLabelActive : null]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
}

function AppTabs() {
  const { user } = useAuth();

  const isFactory =
    user?.role === UserRole.ADMIN || user?.role === UserRole.FACTORY_MANAGER;

  return (
    <Tabs.Navigator
      tabBar={(props) => <WebTabBar {...props} />}
      sceneContainerStyle={Platform.OS === 'web' ? styles.webScene : undefined}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarLabelStyle: theme.typography.label,
        tabBarStyle: styles.mobileTabBar,
      }}
    >
      <Tabs.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'لوحة التحكم', tabBarLabel: 'الرئيسية' }} />
      <Tabs.Screen name="Orders" component={IncomingOrdersScreen} options={{ title: 'الطلبات', tabBarLabel: 'الطلبات' }} />
      {isFactory ? (
        <Tabs.Screen name="Production" component={ProductionKanbanScreen} options={{ title: 'الإنتاج', tabBarLabel: 'الإنتاج' }} />
      ) : (
        <Tabs.Screen name="New Order" component={NewOrderScreen} options={{ title: 'طلب جديد', tabBarLabel: 'طلب جديد' }} />
      )}
      <Tabs.Screen name="Essentials" component={NextDayEssentialsScreen} options={{ title: 'مستلزمات الغد', tabBarLabel: 'الغد' }} />
      {isFactory ? (
        <Tabs.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'التحليلات', tabBarLabel: 'التحليلات' }} />
      ) : null}
      <Tabs.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'الإشعارات', tabBarLabel: 'الإشعارات' }} />
      <Tabs.Screen name="Settings" component={SettingsScreen} options={{ title: 'الإعدادات', tabBarLabel: 'الإعدادات' }} />
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
            <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} options={{ title: 'تفاصيل الطلب' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'الإشعارات' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'الملف الشخصي' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'الإعدادات' }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  mobileTabBar: {
    borderTopColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surfaceContainerLowest,
  },
  webScene: {
    marginRight: 264,
    paddingTop: 64,
    backgroundColor: theme.colors.surface,
  },
  webHeader: {
    position: 'absolute',
    top: 0,
    right: 264,
    left: 0,
    zIndex: 30,
    height: 64,
    paddingHorizontal: 32,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surfaceContainerLowest,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  webHeaderActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 16,
  },
  webSearch: {
    ...theme.typography.body,
    minWidth: 260,
    height: 40,
    paddingHorizontal: 18,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceContainer,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
    lineHeight: 40,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary + '22',
  },
  webSidebar: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    width: 264,
    padding: 24,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  brandBlock: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    ...theme.typography.title,
    color: theme.colors.primary,
    textAlign: 'right',
  },
  brandSubtitle: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
  },
  webNav: {
    gap: 8,
  },
  webNavItem: {
    minHeight: 46,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    borderRightWidth: 4,
    borderRightColor: 'transparent',
  },
  webNavItemActive: {
    backgroundColor: theme.colors.secondaryContainer,
    borderRightColor: theme.colors.primary,
  },
  webNavLabel: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
  },
  webNavLabelActive: {
    color: theme.colors.primary,
    fontFamily: 'Cairo_700Bold',
  },
});
