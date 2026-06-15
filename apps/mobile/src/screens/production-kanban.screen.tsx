import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../lib/api';
import theme from '../theme';
import { buildOrderItemDisplay } from '../lib/order-item-details';
import { RootStackParamList } from '../navigation/types';

const activeColumns = ['New', 'Reviewing', 'In_Production', 'Ready'];

type KanbanOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  deliveryDatetime: string;
  isUrgent: boolean;
  shop?: {
    id: string;
    name: string;
  } | null;
  items?: {
    id: string;
    itemKind: string;
    pieceType?: string | null;
    hasTopDecoration?: boolean;
    layers?: number;
    shape?: string | null;
    moldFlavor?: string | null;
    moldInnerColor?: string | null;
    moldColor?: string | null;
    hasFillings?: boolean;
    filling?: string | null;
    withFoam?: boolean;
    finishType?: string | null;
    specialDetails?: string | null;
    peopleCount?: number;
  }[];
  moldDeliveryShop?: {
    name: string;
  } | null;
};

export function ProductionKanbanScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [kanban, setKanban] = useState<Record<string, KanbanOrder[]>>({});
  const branchGroups = useMemo(() => {
    const groups = new Map<
      string,
      { id: string; name: string; orders: KanbanOrder[] }
    >();

    activeColumns.forEach((column) => {
      (kanban[column] ?? []).forEach((order) => {
        const branchId = order.shop?.id ?? 'unassigned';
        const group = groups.get(branchId) ?? {
          id: branchId,
          name: order.shop?.name ?? 'فرع غير محدد',
          orders: [],
        };

        group.orders.push(order);
        groups.set(branchId, group);
      });
    });

    return [...groups.values()]
      .map((group) => ({
        ...group,
        orders: group.orders.sort(
          (first, second) =>
            Number(second.isUrgent) - Number(first.isUrgent) ||
            new Date(first.deliveryDatetime).getTime() -
              new Date(second.deliveryDatetime).getTime(),
        ),
      }))
      .sort((first, second) => first.name.localeCompare(second.name, 'ar'));
  }, [kanban]);

  useFocusEffect(
    useCallback(() => {
      async function loadKanban() {
        const response = await api.get('/production/kanban');
        setKanban(response.data.columns ?? {});
      }

      void loadKanban();
    }, []),
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>طلبات الإنتاج حسب الفرع</Text>
      {branchGroups.length ? (
        branchGroups.map((branch) => (
          <View key={branch.id} style={styles.branchSection}>
            <View style={styles.branchHeader}>
              <Text style={styles.branchTitle}>{branch.name}</Text>
              <Text style={styles.branchCount}>{branch.orders.length} طلب</Text>
            </View>
            <View style={styles.ordersGrid}>
              {branch.orders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderCard}
                  onPress={() =>
                    navigation.navigate('OrderDetails', { orderId: order.id })
                  }
                >
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderTitle}>{order.orderNumber}</Text>
                    <Text style={order.isUrgent ? styles.urgent : styles.normal}>
                      {order.isUrgent ? 'عاجل' : 'عادي'}
                    </Text>
                  </View>
                  <Text style={styles.customerName}>{order.customerName}</Text>
                  {order.items?.map((item, itemIndex) => {
                    const display = buildOrderItemDisplay(item);

                    return (
                      <View key={item.id} style={styles.itemSummary}>
                        <Text style={styles.itemSummaryTitle}>
                          {`${itemIndex + 1}. ${display.title}`}
                        </Text>
                        {display.lines.map((line) => (
                          <Text key={line} style={styles.itemSummaryLine}>
                            {line}
                          </Text>
                        ))}
                      </View>
                    );
                  })}
                  <Text style={styles.orderText}>
                    مكان التسليم: {order.moldDeliveryShop?.name ?? 'غير محدد'}
                  </Text>
                  <Text style={styles.orderText}>
                    الموعد: {new Date(order.deliveryDatetime).toLocaleString('ar-SY')}
                  </Text>
                  <Text style={styles.detailsHint}>اضغط لعرض التفاصيل والصور</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyState}>لا توجد طلبات إنتاج حالياً.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  heading: {
    ...theme.typography.heading,
    color: theme.colors.onSurface,
    textAlign: 'right',
    width: '100%',
  },
  branchSection: {
    width: '100%',
    gap: theme.spacing.sm,
  },
  branchHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRightWidth: 4,
    borderRightColor: theme.colors.primary,
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  branchTitle: {
    ...theme.typography.heading,
    color: theme.colors.primary,
    textAlign: 'right',
  },
  branchCount: {
    ...theme.typography.label,
    color: theme.colors.primary,
  },
  ordersGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  orderCard: {
    flexGrow: 1,
    flexBasis: 280,
    maxWidth: 420,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surfaceContainerLowest,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  orderHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTitle: {
    ...theme.typography.title,
    color: theme.colors.primary,
    textAlign: 'right',
  },
  customerName: {
    ...theme.typography.title,
    color: theme.colors.onSurface,
    textAlign: 'right',
  },
  orderText: {
    ...theme.typography.body,
    color: theme.colors.onSurface,
    textAlign: 'right',
  },
  urgent: {
    ...theme.typography.label,
    color: theme.colors.error,
  },
  normal: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
  },
  itemSummary: {
    borderRightWidth: 3,
    borderRightColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: theme.spacing.sm,
    gap: 2,
  },
  itemSummaryTitle: {
    ...theme.typography.title,
    color: theme.colors.primary,
    textAlign: 'right',
  },
  itemSummaryLine: {
    ...theme.typography.body,
    color: theme.colors.onSurface,
    textAlign: 'right',
  },
  detailsHint: {
    ...theme.typography.label,
    color: theme.colors.primary,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },
  emptyState: {
    ...theme.typography.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    width: '100%',
  },
});
