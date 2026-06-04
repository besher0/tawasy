import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import api from '../lib/api';
import theme from '../theme';
import { StatusBadge } from '../components/status-badge';
import { cakeShapeLabel, cakeTypeLabel, orderStatusLabel } from '../lib/labels';

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
      Alert.alert('خطأ', 'تعذر تحديث حالة الطلب');
    }
  };

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.meta}>جاري تحميل الطلب...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        <Text style={styles.title}>{order.customerName}</Text>
        <StatusBadge label={orderStatusLabel(order.status)} tone={order.isUrgent ? 'error' : 'neutral'} />
        <Text style={styles.meta}>فرع الطلب: {order.shop?.name ?? '-'}</Text>
        <Text style={styles.meta}>تسليم القالب: {order.moldDeliveryShop?.name ?? order.shop?.name ?? '-'}</Text>
        <Text style={styles.meta}>موعد التسليم: {new Date(order.deliveryDatetime).toLocaleString()}</Text>
        <Text style={styles.meta}>الإجمالي: {order.totalPrice} ر.س</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>تفاصيل الكيك</Text>
        {order.items.map((item: any, index: number) => (
          <Text key={item.id} style={styles.meta}>
            {`${index + 1}. ${cakeTypeLabel(item.cakeType)} - ${cakeShapeLabel(item.shape)} - ${item.filling}`}
          </Text>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => void moveStatus('In_Production')}>
          <Text style={styles.secondaryButtonText}>إلى قيد الإنتاج</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => void moveStatus('Ready')}>
          <Text style={styles.secondaryButtonText}>تعيين جاهز</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={() => void moveStatus('Delivered')}>
          <Text style={styles.primaryButtonText}>تأكيد التسليم</Text>
        </TouchableOpacity>
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
  actions: {
    gap: theme.spacing.sm,
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },
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
