import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { UserRole } from '@sugarprecision/shared-types';
import type { ShopSummary } from '@sugarprecision/shared-types';
import api from '../lib/api';
import { getApiErrorMessage } from '../lib/api-error';
import theme from '../theme';
import { useAuth } from '../context/auth-context';
import {
  essentialsCategoryLabel,
  essentialsStatusLabel,
  orderStatusLabel,
} from '../lib/labels';
import { RootStackParamList } from '../navigation/types';

interface EssentialRow {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  status: string;
  shop?: {
    id: string;
    name: string;
  } | null;
}

interface TomorrowOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  deliveryDatetime: string;
  status: string;
  isUrgent: boolean;
  shop?: {
    name: string;
  } | null;
}

const shopScopedRoles = new Set<string>([UserRole.SHOP_MANAGER, UserRole.SHOP_EMPLOYEE]);

function getTomorrowDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function NextDayEssentialsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [list, setList] = useState<EssentialRow[]>([]);
  const [orders, setOrders] = useState<TomorrowOrder[]>([]);
  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('10');

  const isShopScoped = shopScopedRoles.has(user?.role ?? '');
  const writableShopId = selectedShopId;
  const canCreate = Boolean(writableShopId);
  const selectedShop = shops.find((shop) => shop.id === writableShopId);

  const branchLabel = useMemo(() => {
    if (selectedShop) {
      return `سيتم ربط المستلزم بفرع: ${selectedShop.name}`;
    }

    return isShopScoped
      ? 'حسابك غير مرتبط بفرع صالح.'
      : 'اختر الفرع الذي يحتاج هذه المستلزمات.';
  }, [isShopScoped, selectedShop]);

  const load = useCallback(async () => {
    const tomorrow = getTomorrowDate();
    const [essentialsResponse, ordersResponse] = await Promise.all([
      api.get('/daily-essentials', {
        params: { targetDate: tomorrow },
      }),
      api.get<TomorrowOrder[]>('/orders', {
        params: { date: tomorrow },
      }),
    ]);

    setList(essentialsResponse.data);
    setOrders(ordersResponse.data);
  }, []);

  useEffect(() => {
    async function initialize() {
      try {
        const response = await api.get<ShopSummary[]>('/shops', {
          params: { type: 'Branch' },
        });
        const branches = response.data ?? [];
        const accountShop = user?.shopId
          ? branches.find((shop) => shop.id === user.shopId)
          : undefined;
        const defaultShopId = isShopScoped
          ? accountShop?.id ?? ''
          : branches[0]?.id ?? '';

        setShops(branches);
        setSelectedShopId(defaultShopId);
        await load();
      } catch (error) {
        Alert.alert(
          'خطأ',
          getApiErrorMessage(error, 'تعذر تحميل الفروع أو مستلزمات الغد.'),
        );
      }
    }

    void initialize();
  }, [isShopScoped, load, user?.shopId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const addItem = async () => {
    if (!itemName.trim()) {
      Alert.alert('تنبيه', 'أدخل اسم المادة');
      return;
    }

    const normalizedQuantity = Number(quantity);
    if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
      Alert.alert('تنبيه', 'أدخل كمية صحيحة');
      return;
    }

    if (!canCreate) {
      Alert.alert('تنبيه', 'لا يمكن إضافة مستلزمات لأن حسابك غير مرتبط بفرع.');
      return;
    }

    try {
      await api.post('/daily-essentials', {
        ...(!isShopScoped ? { shopId: writableShopId } : {}),
        category: 'Supplies',
        itemName: itemName.trim(),
        quantity: normalizedQuantity,
        targetDate: getTomorrowDate(),
        status: 'Pending',
      });

      setItemName('');
      await load();
    } catch (error) {
      Alert.alert(
        'خطأ',
        getApiErrorMessage(error, 'تعذر إضافة المادة.'),
      );
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.formCard}>
        <Text style={styles.heading}>طلبيات اليوم التالي</Text>
        <Text style={styles.helper}>{branchLabel}</Text>
        {!isShopScoped ? (
          <View style={styles.shopOptions}>
            {shops.map((shop) => {
              const active = selectedShopId === shop.id;
              return (
                <TouchableOpacity
                  key={shop.id}
                  style={[styles.shopChip, active ? styles.shopChipActive : null]}
                  onPress={() => setSelectedShopId(shop.id)}
                >
                  <Text style={[styles.shopChipText, active ? styles.shopChipTextActive : null]}>
                    {shop.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
        <TextInput style={styles.input} value={itemName} onChangeText={setItemName} placeholder="اسم المادة" />
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          placeholder="الكمية"
        />
        <TouchableOpacity style={[styles.button, !canCreate ? styles.buttonDisabled : null]} onPress={addItem}>
          <Text style={styles.buttonText}>إضافة</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.ordersSection}>
            <Text style={styles.sectionTitle}>طلبات التسليم غداً</Text>
            {orders.length ? (
              orders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderCard}
                  onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
                >
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                    <Text style={order.isUrgent ? styles.urgent : styles.itemMeta}>
                      {order.isUrgent ? 'عاجل' : 'عادي'}
                    </Text>
                  </View>
                  <Text style={styles.itemName}>{order.customerName}</Text>
                  <Text style={styles.itemMeta}>
                    الفرع: {order.shop?.name ?? 'غير محدد'}
                  </Text>
                  <Text style={styles.itemMeta}>
                    الحالة: {orderStatusLabel(order.status)}
                  </Text>
                  <Text style={styles.itemMeta}>
                    الموعد: {new Date(order.deliveryDatetime).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>لا توجد طلبات تسليم للغد.</Text>
            )}
            <Text style={styles.sectionTitle}>مستلزمات الغد</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.itemName}>{item.itemName}</Text>
            {item.shop?.name ? <Text style={styles.itemMeta}>الفرع: {item.shop.name}</Text> : null}
            <Text style={styles.itemMeta}>الفئة: {essentialsCategoryLabel(item.category)}</Text>
            <Text style={styles.itemMeta}>الكمية: {item.quantity}</Text>
            <Text style={styles.itemMeta}>الحالة: {essentialsStatusLabel(item.status)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: theme.colors.surface },
  formCard: {
    margin: theme.spacing.lg,
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  heading: { ...theme.typography.heading, color: theme.colors.onSurface, textAlign: 'right' },
  helper: { ...theme.typography.label, color: theme.colors.onSurfaceVariant, textAlign: 'right' },
  shopOptions: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  shopChip: {
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  shopChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.secondaryContainer,
  },
  shopChipText: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
  },
  shopChipTextActive: {
    color: theme.colors.primary,
  },
  input: {
    height: 44,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    textAlign: 'right',
    ...theme.typography.body,
  },
  button: {
    height: 44,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  buttonText: { ...theme.typography.title, color: theme.colors.onPrimary },
  list: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.sm,
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },
  ordersSection: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.title,
    color: theme.colors.primary,
    textAlign: 'right',
    marginTop: theme.spacing.sm,
  },
  orderCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    padding: theme.spacing.md,
    gap: 2,
  },
  orderHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    ...theme.typography.title,
    color: theme.colors.primary,
  },
  urgent: {
    ...theme.typography.label,
    color: theme.colors.error,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
  },
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    padding: theme.spacing.md,
    gap: 2,
  },
  itemName: { ...theme.typography.title, color: theme.colors.onSurface, textAlign: 'right' },
  itemMeta: { ...theme.typography.body, color: theme.colors.onSurfaceVariant, textAlign: 'right' },
});
