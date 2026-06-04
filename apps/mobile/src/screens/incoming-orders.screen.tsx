import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import theme from '../theme';
import api from '../lib/api';
import { StatusBadge } from '../components/status-badge';
import { orderStatusLabel } from '../lib/labels';

interface OrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  deliveryDatetime: string;
  isUrgent: boolean;
  moldDeliveryShop?: {
    name: string;
    location: string;
  } | null;
}

export function IncomingOrdersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [search, setSearch] = useState('');

  const loadOrders = useCallback(async () => {
    const response = await api.get('/orders', {
      params: {
        search: search || undefined,
      },
    });
    setOrders(response.data);
  }, [search]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.heading}>الطلبات الواردة</Text>
        <TextInput
          style={styles.search}
          placeholder="بحث عن طلب أو عميل"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => void loadOrders()}
        />
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.orderNumber}>{item.orderNumber}</Text>
              <StatusBadge
                label={item.isUrgent ? 'عاجل' : 'عادي'}
                tone={item.isUrgent ? 'error' : 'neutral'}
              />
            </View>
            <Text style={styles.customer}>{item.customerName}</Text>
            <Text style={styles.meta}>الحالة: {orderStatusLabel(item.status)}</Text>
            <Text style={styles.meta}>التسليم: {new Date(item.deliveryDatetime).toLocaleString()}</Text>
            <Text style={styles.meta}>تسليم القالب: {item.moldDeliveryShop?.name ?? 'غير محدد'}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: theme.colors.surface },
  header: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },
  heading: {
    ...theme.typography.heading,
    color: theme.colors.onSurface,
    textAlign: 'right',
  },
  search: {
    height: 48,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surfaceContainerLowest,
    paddingHorizontal: theme.spacing.md,
    textAlign: 'right',
    ...theme.typography.body,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  rowBetween: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    ...theme.typography.title,
    color: theme.colors.primary,
  },
  customer: {
    ...theme.typography.title,
    color: theme.colors.onSurface,
    textAlign: 'right',
  },
  meta: {
    ...theme.typography.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
  },
});
