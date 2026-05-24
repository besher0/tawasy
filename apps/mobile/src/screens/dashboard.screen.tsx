import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { ScreenContainer } from '../components/screen-container';
import { StatCard } from '../components/stat-card';
import theme from '../theme';
import api from '../lib/api';

export function DashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [overview, setOverview] = useState<{
    totalSales: number;
    totalOrders: number;
    completionRate: number;
    avgOrderValue: number;
    delayedCount: number;
  } | null>(null);

  useEffect(() => {
    async function load() {
      const response = await api.get('/analytics/overview');
      setOverview(response.data);
    }

    void load();
  }, []);

  return (
    <ScreenContainer>
      <Text style={styles.heading}>مرحباً، مدير الإنتاج</Text>
      <Text style={styles.subheading}>نظرة عامة على أداء اليوم</Text>

      <StatCard
        title="إجمالي المبيعات"
        value={`${Math.round(overview?.totalSales ?? 0)} ر.س`}
      />
      <StatCard title="إجمالي الطلبات" value={`${overview?.totalOrders ?? 0}`} />
      <StatCard
        title="نسبة الإنجاز"
        value={`${(overview?.completionRate ?? 0).toFixed(1)}%`}
      />
      <StatCard
        title="متوسط قيمة الطلب"
        value={`${(overview?.avgOrderValue ?? 0).toFixed(1)} ر.س`}
      />
      <StatCard title="طلبات متأخرة" value={`${overview?.delayedCount ?? 0}`} />

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.primaryAction}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={styles.primaryActionText}>عرض الإشعارات</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.secondaryActionText}>الإعدادات</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heading: {
    ...theme.typography.heading,
    color: theme.colors.onSurface,
    textAlign: 'right',
  },
  subheading: {
    ...theme.typography.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    gap: theme.spacing.sm,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  primaryActionText: {
    ...theme.typography.title,
    color: theme.colors.onPrimary,
  },
  secondaryAction: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  secondaryActionText: {
    ...theme.typography.title,
    color: theme.colors.onSurface,
  },
});