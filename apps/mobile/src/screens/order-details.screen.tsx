import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import api from '../lib/api';
import { downloadRemoteFile } from '../lib/download';
import theme from '../theme';
import {
  cakeFinishLabel,
  cakeShapeLabel,
  moldFlavorLabel,
  orderItemKindLabel,
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

  const downloadImage = async (
    imageUrl: string,
    itemIndex: number,
    imageIndex: number,
  ) => {
    try {
      await downloadRemoteFile(
        imageUrl,
        `${order.orderNumber}-item-${itemIndex + 1}-image-${imageIndex + 1}.jpg`,
      );
    } catch {
      Alert.alert('خطأ', 'تعذر تحميل الصورة.');
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
        <Text style={[styles.meta, order.isUrgent ? styles.urgent : null]}>
          {order.isUrgent ? 'طلب عاجل' : 'طلب عادي'}
        </Text>
        <Text style={styles.meta}>فرع الطلب: {order.shop?.name ?? '-'}</Text>
        <Text style={styles.meta}>مكان التسليم: {order.moldDeliveryShop?.name ?? order.shop?.name ?? '-'}</Text>
        <Text style={styles.meta}>موعد التسليم: {new Date(order.deliveryDatetime).toLocaleString()}</Text>
        <Text style={styles.meta}>رقم الهاتف: {order.customerPhone}</Text>
        <Text style={styles.meta}>الإجمالي: {order.totalPrice} ر.س</Text>
        <Text style={styles.meta}>العربون: {order.depositAmount} ر.س</Text>
        {order.notes ? <Text style={styles.orderNotes}>ملاحظات: {order.notes}</Text> : null}
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
                <Text style={styles.meta}>لون القالب: {item.moldColor ?? '-'}</Text>
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
                  <View key={`${imageUrl}-${imageIndex}`} style={styles.imageCard}>
                    <Image source={{ uri: imageUrl }} style={styles.referenceImage} />
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="تحميل الصورة"
                      style={styles.downloadImageButton}
                      onPress={() => void downloadImage(imageUrl, index, imageIndex)}
                    >
                      <MaterialIcons name="download" size={18} color={theme.colors.onPrimary} />
                      <Text style={styles.downloadImageText}>تحميل</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
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
  urgent: { color: theme.colors.error, fontFamily: 'Cairo_700Bold' },
  orderNotes: {
    ...theme.typography.body,
    color: theme.colors.onSurface,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    textAlign: 'right',
  },
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
  imageCard: {
    width: 132,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceContainerLowest,
  },
  referenceImage: {
    width: '100%',
    height: 118,
  },
  downloadImageButton: {
    minHeight: 38,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  downloadImageText: { ...theme.typography.label, color: theme.colors.onPrimary },
});
