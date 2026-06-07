import React, { useCallback, useState } from 'react';
import {
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { UserRole } from '@sugarprecision/shared-types';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../context/auth-context';
import theme from '../theme';
import api from '../lib/api';
import { StatusBadge } from '../components/status-badge';
import { moldConfigurationLabel, orderStatusLabel } from '../lib/labels';

interface OrderItemPreview {
  id: string;
  itemKind: string;
  moldFlavor?: string | null;
  moldColor?: string | null;
}

interface OrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  deliveryDatetime: string;
  isUrgent: boolean;
  items?: OrderItemPreview[];
  shop?: {
    id: string;
    name: string;
  } | null;
  moldDeliveryShop?: {
    name: string;
    location: string;
  } | null;
}

interface OrderSection {
  title: string;
  dateKey: string;
  branchKey: string;
  branchName: string;
  showBranchHeader: boolean;
  data: OrderRow[];
}

function getLocalDateKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDayTitle(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  const today = getLocalDateKey(new Date().toISOString());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = getLocalDateKey(tomorrowDate.toISOString());

  const prefix =
    dateKey === today
      ? 'اليوم'
      : dateKey === tomorrow
        ? 'غداً'
        : date.toLocaleDateString('ar-SY', { weekday: 'long' });

  return `${prefix}، ${date.toLocaleDateString('ar-SY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;
}

export function IncomingOrdersScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [search, setSearch] = useState('');
  const isFactoryView =
    user?.role === UserRole.ADMIN || user?.role === UserRole.FACTORY_MANAGER;

  const loadOrders = useCallback(async () => {
    const response = await api.get('/orders', {
      params: {
        search: search || undefined,
      },
    });
    setOrders(response.data);
  }, [search]);

  const sections = [...orders]
    .sort(
      (first, second) => {
        if (isFactoryView) {
          const branchComparison = (first.shop?.name ?? '').localeCompare(
            second.shop?.name ?? '',
            'ar',
          );

          if (branchComparison !== 0) {
            return branchComparison;
          }
        }

        return (
          new Date(first.deliveryDatetime).getTime() -
          new Date(second.deliveryDatetime).getTime()
        );
      },
    )
    .reduce<OrderSection[]>((result, order) => {
      const dateKey = getLocalDateKey(order.deliveryDatetime);
      const branchKey = isFactoryView ? order.shop?.id ?? 'unassigned' : 'current';
      const branchName = order.shop?.name ?? 'فرع غير محدد';
      const existingSection = result[result.length - 1];

      if (
        existingSection?.dateKey === dateKey &&
        existingSection.branchKey === branchKey
      ) {
        existingSection.data.push(order);
      } else {
        result.push({
          dateKey,
          branchKey,
          branchName,
          showBranchHeader:
            isFactoryView && existingSection?.branchKey !== branchKey,
          title: formatDayTitle(dateKey),
          data: [order],
        });
      }

      return result;
    }, []);

  useFocusEffect(useCallback(() => {
    void loadOrders();
  }, [loadOrders]));

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

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={<Text style={styles.emptyText}>لا توجد طلبات لعرضها.</Text>}
        renderSectionHeader={({ section }) => (
          <>
            {section.showBranchHeader ? (
              <View style={styles.branchHeader}>
                <Text style={styles.branchTitle}>{section.branchName}</Text>
              </View>
            ) : null}
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>{section.title}</Text>
              <Text style={styles.dayCount}>{section.data.length} طلب</Text>
            </View>
          </>
        )}
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
            {item.items?.some((orderItem) => orderItem.itemKind === 'Mold') ? (
              <Text style={styles.moldSummary}>
                القوالب:{' '}
                {item.items
                  .filter((orderItem) => orderItem.itemKind === 'Mold')
                  .map((orderItem) =>
                    moldConfigurationLabel(orderItem.moldFlavor, orderItem.moldColor),
                  )
                  .join('، ')}
              </Text>
            ) : null}
            <Text style={styles.meta}>الحالة: {orderStatusLabel(item.status)}</Text>
            <Text style={styles.meta}>
              وقت التسليم: {new Date(item.deliveryDatetime).toLocaleTimeString('ar-SY', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <Text style={styles.meta}>مكان التسليم: {item.moldDeliveryShop?.name ?? 'غير محدد'}</Text>
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
  dayHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
  },
  branchHeader: {
    borderRightWidth: 4,
    borderRightColor: theme.colors.primary,
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  branchTitle: {
    ...theme.typography.heading,
    color: theme.colors.primary,
    textAlign: 'right',
  },
  dayTitle: {
    ...theme.typography.title,
    color: theme.colors.onSurface,
    textAlign: 'right',
  },
  dayCount: {
    ...theme.typography.label,
    color: theme.colors.primary,
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
  moldSummary: {
    ...theme.typography.body,
    color: theme.colors.primary,
    textAlign: 'right',
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: theme.spacing.xxl,
  },
});
