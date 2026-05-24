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
      <Text style={styles.heading}>ط¸â€¦ط·آ±ط·آ­ط·آ¨ط·آ§ط¸â€¹ط·إ’ ط¸â€¦ط·آ¯ط¸ظ¹ط·آ± ط·آ§ط¸â€‍ط·آ¥ط¸â€ ط·ع¾ط·آ§ط·آ¬</Text>
      <Text style={styles.subheading}>ط¸â€ ط·آ¸ط·آ±ط·آ© ط·آ¹ط·آ§ط¸â€¦ط·آ© ط·آ¹ط¸â€‍ط¸â€° ط·آ£ط·آ¯ط·آ§ط·طŒ ط·آ§ط¸â€‍ط¸ظ¹ط¸ث†ط¸â€¦</Text>

      <StatCard
        title="ط·آ¥ط·آ¬ط¸â€¦ط·آ§ط¸â€‍ط¸ظ¹ ط·آ§ط¸â€‍ط¸â€¦ط·آ¨ط¸ظ¹ط·آ¹ط·آ§ط·ع¾"
        value={`${Math.round(overview?.totalSales ?? 0)} ط·آ±.ط·آ³`}
      />
      <StatCard title="ط·آ¥ط·آ¬ط¸â€¦ط·آ§ط¸â€‍ط¸ظ¹ ط·آ§ط¸â€‍ط·آ·ط¸â€‍ط·آ¨ط·آ§ط·ع¾" value={`${overview?.totalOrders ?? 0}`} />
      <StatCard
        title="ط¸â€ ط·آ³ط·آ¨ط·آ© ط·آ§ط¸â€‍ط·آ¥ط¸â€ ط·آ¬ط·آ§ط·آ²"
        value={`${(overview?.completionRate ?? 0).toFixed(1)}%`}
      />
      <StatCard
        title="ط¸â€¦ط·ع¾ط¸ث†ط·آ³ط·آ· ط¸â€ڑط¸ظ¹ط¸â€¦ط·آ© ط·آ§ط¸â€‍ط·آ·ط¸â€‍ط·آ¨"
        value={`${(overview?.avgOrderValue ?? 0).toFixed(1)} ط·آ±.ط·آ³`}
      />
      <StatCard title="ط·آ·ط¸â€‍ط·آ¨ط·آ§ط·ع¾ ط¸â€¦ط·ع¾ط·آ£ط·آ®ط·آ±ط·آ©" value={`${overview?.delayedCount ?? 0}`} />

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.primaryAction}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={styles.primaryActionText}>ط·آ¹ط·آ±ط·آ¶ ط·آ§ط¸â€‍ط·آ¥ط·آ´ط·آ¹ط·آ§ط·آ±ط·آ§ط·ع¾</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.secondaryActionText}>ط·آ§ط¸â€‍ط·آ¥ط·آ¹ط·آ¯ط·آ§ط·آ¯ط·آ§ط·ع¾</Text>
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