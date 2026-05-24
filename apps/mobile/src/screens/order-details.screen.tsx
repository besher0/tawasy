import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import api from '../lib/api';
import theme from '../theme';
import { StatusBadge } from '../components/status-badge';

type ScreenRoute = RouteProp<RootStackParamList, 'OrderDetails'>;

export function OrderDetailsScreen() {
  const route = useRoute<ScreenRoute>();
  const [order, setOrder] = useState<any>(null);

  const loadOrder = async () => {
    const response = await api.get(`/orders/${route.params.orderId}`);
    setOrder(response.data);
  };

  useEffect(() => {
    void loadOrder();
  }, []);

  const moveStatus = async (status: string) => {
    try {
      await api.post(`/orders/${route.params.orderId}/status`, { status });
      await loadOrder();
    } catch {
      Alert.alert('ط·آ®ط·آ·ط·آ£', 'ط·ع¾ط·آ¹ط·آ°ط·آ± ط·ع¾ط·آ­ط·آ¯ط¸ظ¹ط·آ« ط·آ­ط·آ§ط¸â€‍ط·آ© ط·آ§ط¸â€‍ط·آ·ط¸â€‍ط·آ¨');
    }
  };

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        <Text style={styles.title}>{order.customerName}</Text>
        <StatusBadge label={order.status} tone={order.isUrgent ? 'error' : 'neutral'} />
        <Text style={styles.meta}>ط·آ§ط¸â€‍ط·ع¾ط·آ³ط¸â€‍ط¸ظ¹ط¸â€¦: {new Date(order.deliveryDatetime).toLocaleString()}</Text>
        <Text style={styles.meta}>ط·آ§ط¸â€‍ط·آ¥ط·آ¬ط¸â€¦ط·آ§ط¸â€‍ط¸ظ¹: {order.totalPrice} ط·آ±.ط·آ³</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>ط·ع¾ط¸ظ¾ط·آ§ط·آµط¸ظ¹ط¸â€‍ ط·آ§ط¸â€‍ط¸ئ’ط¸ظ¹ط¸ئ’</Text>
        {order.items.map((item: any, index: number) => (
          <Text key={item.id} style={styles.meta}>
            {`${index + 1}. ${item.cakeType} - ${item.shape} - ${item.filling}`}
          </Text>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => void moveStatus('In_Production')}>
          <Text style={styles.secondaryButtonText}>ط·آ¥ط¸â€‍ط¸â€° ط¸â€ڑط¸ظ¹ط·آ¯ ط·آ§ط¸â€‍ط·آ¥ط¸â€ ط·ع¾ط·آ§ط·آ¬</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => void moveStatus('Ready')}>
          <Text style={styles.secondaryButtonText}>ط·ع¾ط·آ¹ط¸ظ¹ط¸ظ¹ط¸â€  ط·آ¬ط·آ§ط¸â€،ط·آ²</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={() => void moveStatus('Delivered')}>
          <Text style={styles.primaryButtonText}>ط·ع¾ط·آ£ط¸ئ’ط¸ظ¹ط·آ¯ ط·آ§ط¸â€‍ط·ع¾ط·آ³ط¸â€‍ط¸ظ¹ط¸â€¦</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  orderNumber: { ...theme.typography.title, color: theme.colors.primary, textAlign: 'right' },
  title: { ...theme.typography.title, color: theme.colors.onSurface, textAlign: 'right' },
  meta: { ...theme.typography.body, color: theme.colors.onSurfaceVariant, textAlign: 'right' },
  actions: { gap: theme.spacing.sm },
  secondaryButton: {
    height: 44,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { ...theme.typography.title, color: theme.colors.onSurface },
  primaryButton: {
    height: 48,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { ...theme.typography.title, color: theme.colors.onPrimary },
});