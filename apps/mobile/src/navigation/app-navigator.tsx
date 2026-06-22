import React from "react";
import {
  ActivityIndicator,
  I18nManager,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  BottomTabBar,
  BottomTabBarProps,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import { MaterialIcons } from "@expo/vector-icons";
import { UserRole } from "@sugarprecision/shared-types";
import { useAuth } from "../context/auth-context";
import theme from "../theme";
import { RootStackParamList } from "./types";
import { LoginScreen } from "../screens/login.screen";
import { IncomingOrdersScreen } from "../screens/incoming-orders.screen";
import { ProductionKanbanScreen } from "../screens/production-kanban.screen";
import { NewOrderScreen } from "../screens/new-order.screen";
import { NextDayEssentialsScreen } from "../screens/next-day-essentials.screen";
import { AnalyticsScreen } from "../screens/analytics.screen";
import { OrderDetailsScreen } from "../screens/order-details.screen";
import { OrderEditScreen } from "../screens/order-edit.screen";
import { ProfileScreen } from "../screens/profile.screen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

const TAB_LABELS: Record<string, string> = {
  Orders: "الطلبات",
  Production: "الإنتاج",
  "New Order": "طلب جديد",
  Essentials: "الطلبيات اليومية",
  Analytics: "التحليلات",
  Account: "الحساب",
};

const TAB_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Orders: "shopping-cart",
  Production: "factory",
  "New Order": "add-shopping-cart",
  Essentials: "inventory",
  Analytics: "analytics",
  Account: "person",
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
  const { state, navigation } = props;
  const { logout } = useAuth();

  if (Platform.OS !== "web") {
    return <BottomTabBar {...props} />;
  }

  return (
    <>
      <View style={styles.webHeader}>
        <View style={styles.webHeaderActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="فتح الحساب"
            style={styles.avatar}
            onPress={() => navigation.navigate("Account")}
          >
            <MaterialIcons
              name="person"
              size={22}
              color={theme.colors.onPrimary}
            />
          </Pressable>
        </View>
        <Text style={styles.webSearch}>بحث عن الطلبات...</Text>
      </View>

      <View style={styles.webSidebar}>
        <View style={styles.brandBlock}>
          <View style={styles.brandIcon}>
            <MaterialIcons
              name="bakery-dining"
              size={24}
              color={theme.colors.onPrimary}
            />
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
            const iconName = TAB_ICONS[route.name] ?? "circle";

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                style={[
                  styles.webNavItem,
                  focused ? styles.webNavItemActive : null,
                ]}
                onPress={() => {
                  const event = navigation.emit({
                    type: "tabPress",
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
                  color={
                    focused
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant
                  }
                />
                <Text
                  style={[
                    styles.webNavLabel,
                    focused ? styles.webNavLabelActive : null,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          style={styles.webLogout}
          onPress={() => void logout()}
        >
          <MaterialIcons name="logout" size={21} color={theme.colors.error} />
          <Text style={styles.webLogoutText}>تسجيل الخروج</Text>
        </Pressable>
      </View>
    </>
  );
}

function AppTabs() {
  const { user } = useAuth();
  const isFactory =
    user?.role === UserRole.ADMIN || user?.role === UserRole.FACTORY_MANAGER;
  const canCreateOrder =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.SHOP_MANAGER ||
    user?.role === UserRole.SHOP_EMPLOYEE;

  return (
    <Tabs.Navigator
      tabBar={(props) => <WebTabBar {...props} />}
      sceneContainerStyle={Platform.OS === "web" ? styles.webScene : undefined}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarLabelStyle: theme.typography.label,
        tabBarStyle: styles.mobileTabBar,
      }}
    >
      <Tabs.Screen
        name="Orders"
        component={IncomingOrdersScreen}
        options={{ title: "الطلبات", tabBarLabel: "الطلبات" }}
      />
      {isFactory ? (
        <Tabs.Screen
          name="Production"
          component={ProductionKanbanScreen}
          options={{ title: "الإنتاج", tabBarLabel: "الإنتاج" }}
        />
      ) : null}
      {canCreateOrder ? (
        <Tabs.Screen
          name="New Order"
          component={NewOrderScreen}
          options={{ title: "طلب جديد", tabBarLabel: "طلب جديد" }}
        />
      ) : null}
      <Tabs.Screen
        name="Essentials"
        component={NextDayEssentialsScreen}
        options={{ title: "الطلبيات اليومية", tabBarLabel: "الطلبيات" }}
      />
      {isFactory ? (
        <Tabs.Screen
          name="Analytics"
          component={AnalyticsScreen}
          options={{ title: "التحليلات", tabBarLabel: "التحليلات" }}
        />
      ) : null}
      <Tabs.Screen
        name="Account"
        component={ProfileScreen}
        options={{ title: "الحساب", tabBarLabel: "الحساب" }}
      />
    </Tabs.Navigator>
  );
}

export function AppNavigator() {
  const { loading, user } = useAuth();

  if (!I18nManager.isRTL) {
    I18nManager.allowRTL(true);
  }

  if (loading) {
    return (
      <ActivityIndicator
        style={{ flex: 1 }}
        size="large"
        color={theme.colors.primary}
      />
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator>
        {user ? (
          <>
            <Stack.Screen
              name="App"
              component={AppTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OrderDetails"
              component={OrderDetailsScreen}
              options={{ title: "تفاصيل الطلب" }}
            />
            <Stack.Screen
              name="EditOrder"
              component={OrderEditScreen}
              options={{ title: "تعديل الطلب" }}
            />
          </>
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
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
    position: "absolute",
    top: 0,
    right: 264,
    left: 0,
    zIndex: 30,
    height: 64,
    paddingHorizontal: 32,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surfaceContainerLowest,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  webHeaderActions: {
    flexDirection: "row-reverse",
    alignItems: "center",
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
    textAlign: "right",
    lineHeight: 40,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.colors.surfaceContainerLowest,
  },
  webSidebar: {
    position: "absolute",
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
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  brandTitle: {
    ...theme.typography.title,
    color: theme.colors.primary,
    textAlign: "right",
  },
  brandSubtitle: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
    textAlign: "right",
  },
  webNav: {
    gap: 8,
  },
  webLogout: {
    minHeight: 46,
    marginTop: "auto",
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorContainer,
  },
  webLogoutText: {
    ...theme.typography.label,
    color: theme.colors.error,
    fontFamily: "Cairo_700Bold",
  },
  webNavItem: {
    minHeight: 46,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    borderRightWidth: 4,
    borderRightColor: "transparent",
  },
  webNavItemActive: {
    backgroundColor: theme.colors.secondaryContainer,
    borderRightColor: theme.colors.primary,
  },
  webNavLabel: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
    textAlign: "right",
  },
  webNavLabelActive: {
    color: theme.colors.primary,
    fontFamily: "Cairo_700Bold",
  },
});
