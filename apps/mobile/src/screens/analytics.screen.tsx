import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import api from '../lib/api';
import theme from '../theme';
import { StatCard } from '../components/stat-card';
import { cakeTypeLabel } from '../lib/labels';

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
      <Text style={styles.heading}>التحليلات والتقارير</Text>

      <StatCard title="إجمالي المبيعات" value={`${Math.round(overview?.totalSales ?? 0)} ر.س`} />
      <StatCard title="إجمالي الطلبات" value={`${overview?.totalOrders ?? 0}`} />
      <StatCard title="نسبة الإنجاز" value={`${(overview?.completionRate ?? 0).toFixed(1)}%`} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>اتجاه الطلبات اليومية</Text>
        {trend.map((point) => (
          <Text key={point.date} style={styles.rowText}>{`${point.date} - ${point.count} طلب`}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>أكثر المنتجات طلباً</Text>
        {topProducts.map((product) => (
          <Text key={product.label} style={styles.rowText}>{`${cakeTypeLabel(product.label)} (${product.quantity})`}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>أكثر الفروع طلباً</Text>
        {topShops.map((shop) => (
          <Text key={shop.shopName} style={styles.rowText}>{`${shop.shopName} (${shop.ordersCount} طلب)`}</Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },
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
