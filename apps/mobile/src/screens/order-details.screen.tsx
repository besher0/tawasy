import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import api from '../lib/api';
import theme from '../theme';
import { StatusBadge } from '../components/status-badge';
import {
  cakeFinishLabel,
  cakeShapeLabel,
  moldFlavorLabel,
  orderItemKindLabel,
  orderStatusLabel,
} from '../lib/labels';

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
        <Text style={styles.meta}>مكان التسليم: {order.moldDeliveryShop?.name ?? order.shop?.name ?? '-'}</Text>
        <Text style={styles.meta}>موعد التسليم: {new Date(order.deliveryDatetime).toLocaleString()}</Text>
        <Text style={styles.meta}>الإجمالي: {order.totalPrice} ر.س</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>تفاصيل المنتجات</Text>
        {order.items.map((item: any, index: number) => (
          <View key={item.id} style={styles.itemCard}>
            <Text style={styles.itemTitle}>
              {`${index + 1}. ${orderItemKindLabel(item.itemKind)}`}
            </Text>
            {item.itemKind === 'Pieces' ? (
              <>
                <Text style={styles.meta}>نوع القطع: {item.pieceType ?? '-'}</Text>
                <Text style={styles.meta}>عدد الطبقات: {item.layers}</Text>
                <Text style={styles.meta}>شيء فوقها: {item.hasTopDecoration ? 'نعم' : 'لا'}</Text>
                <Text style={styles.meta}>عدد القطع: {item.peopleCount}</Text>
              </>
            ) : (
              <>
                <Text style={styles.meta}>نوع القالب: {moldFlavorLabel(item.moldFlavor)}</Text>
                <Text style={styles.meta}>الحشوات: {item.hasFillings ? item.filling ?? 'نعم' : 'لا'}</Text>
                <Text style={styles.meta}>الشكل: {cakeShapeLabel(item.shape)}</Text>
                <Text style={styles.meta}>الفلين: {item.withFoam ? 'مع فلين' : 'بدون فلين'}</Text>
                <Text style={styles.meta}>الطوابق: {item.layers}</Text>
                <Text style={styles.meta}>التجهيز: {cakeFinishLabel(item.finishType)}</Text>
                <Text style={styles.meta}>عدد الأشخاص: {item.peopleCount}</Text>
              </>
            )}
            {item.specialDetails ? (
              <Text style={styles.meta}>ملاحظات: {item.specialDetails}</Text>
            ) : null}
            {item.referenceImages?.length ? (
              <View style={styles.imageRow}>
                {item.referenceImages.map((imageUrl: string, imageIndex: number) => (
                  <Image
                    key={`${imageUrl}-${imageIndex}`}
                    source={{ uri: imageUrl }}
                    style={styles.referenceImage}
                  />
                ))}
              </View>
            ) : null}
          </View>
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
  itemCard: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  itemTitle: {
    ...theme.typography.title,
    color: theme.colors.primary,
    textAlign: 'right',
  },
  imageRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  referenceImage: {
    width: 96,
    height: 96,
    borderRadius: theme.radius.md,
  },
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
