import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import api from '../lib/api';
import theme from '../theme';
import { StatCard } from '../components/stat-card';

export function AnalyticsScreen() {
  const [overview, setOverview] = useState<any>(null);
  const [trend, setTrend] = useState<Array<{ date: string; count: number }>>([]);
  const [topProducts, setTopProducts] = useState<Array<{ label: string; quantity: number }>>([]);
  const [topShops, setTopShops] = useState<Array<{ shopName: string; ordersCount: number }>>([]);

  useEffect(() => {
    async function load() {
      const [overviewRes, trendRes, productsRes, shopsRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/orders-trend', { params: { days: 7 } }),
        api.get('/analytics/top-products', { params: { limit: 5 } }),
        api.get('/analytics/top-shops', { params: { limit: 5 } }),
      ]);

      setOverview(overviewRes.data);
      setTrend(trendRes.data.points ?? []);
      setTopProducts(productsRes.data.items ?? []);
      setTopShops(shopsRes.data.items ?? []);
    }

    void load();
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>ط·آ§ط¸â€‍ط·ع¾ط·آ­ط¸â€‍ط¸ظ¹ط¸â€‍ط·آ§ط·ع¾ ط¸ث†ط·آ§ط¸â€‍ط·ع¾ط¸â€ڑط·آ§ط·آ±ط¸ظ¹ط·آ±</Text>

      <StatCard title="ط·آ¥ط·آ¬ط¸â€¦ط·آ§ط¸â€‍ط¸ظ¹ ط·آ§ط¸â€‍ط¸â€¦ط·آ¨ط¸ظ¹ط·آ¹ط·آ§ط·ع¾" value={`${Math.round(overview?.totalSales ?? 0)} ط·آ±.ط·آ³`} />
      <StatCard title="ط·آ¥ط·آ¬ط¸â€¦ط·آ§ط¸â€‍ط¸ظ¹ ط·آ§ط¸â€‍ط·آ·ط¸â€‍ط·آ¨ط·آ§ط·ع¾" value={`${overview?.totalOrders ?? 0}`} />
      <StatCard title="ط¸â€ ط·آ³ط·آ¨ط·آ© ط·آ§ط¸â€‍ط·آ¥ط¸â€ ط·آ¬ط·آ§ط·آ²" value={`${(overview?.completionRate ?? 0).toFixed(1)}%`} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>ط·آ§ط·ع¾ط·آ¬ط·آ§ط¸â€، ط·آ§ط¸â€‍ط·آ·ط¸â€‍ط·آ¨ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط¸ظ¹ط¸ث†ط¸â€¦ط¸ظ¹ط·آ©</Text>
        {trend.map((point) => (
          <Text key={point.date} style={styles.rowText}>{`${point.date}: ${point.count}`}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>ط·آ£ط¸ئ’ط·آ«ط·آ± ط·آ§ط¸â€‍ط¸â€¦ط¸â€ ط·ع¾ط·آ¬ط·آ§ط·ع¾ ط·آ·ط¸â€‍ط·آ¨ط·آ§ط¸â€¹</Text>
        {topProducts.map((product) => (
          <Text key={product.label} style={styles.rowText}>{`${product.label} (${product.quantity})`}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>ط·آ£ط¸ئ’ط·آ«ط·آ± ط·آ§ط¸â€‍ط¸ظ¾ط·آ±ط¸ث†ط·آ¹ ط·آ·ط¸â€‍ط·آ¨ط·آ§ط¸â€¹</Text>
        {topShops.map((shop) => (
          <Text key={shop.shopName} style={styles.rowText}>{`${shop.shopName} (${shop.ordersCount})`}</Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg },
  heading: { ...theme.typography.heading, color: theme.colors.onSurface, textAlign: 'right' },
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  cardTitle: { ...theme.typography.title, color: theme.colors.primary, textAlign: 'right' },
  rowText: { ...theme.typography.body, color: theme.colors.onSurfaceVariant, textAlign: 'right' },
});