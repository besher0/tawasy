import React, { useCallback, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../lib/api';
import theme from '../theme';
import { moldConfigurationLabel, orderStatusLabel } from '../lib/labels';

const columns = ['New', 'Reviewing', 'In_Production', 'Ready'];

type KanbanOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  isUrgent: boolean;
  shop?: {
    id: string;
    name: string;
  } | null;
  items?: {
    id: string;
    itemKind: string;
    moldFlavor?: string | null;
    moldColor?: string | null;
  }[];
  moldDeliveryShop?: {
    name: string;
  } | null;
};

export function ProductionKanbanScreen() {
  const [kanban, setKanban] = useState<Record<string, KanbanOrder[]>>({});
  const branchGroups = useMemo(() => {
    const groups = new Map<
      string,
      { id: string; name: string; columns: Record<string, KanbanOrder[]> }
    >();

    columns.forEach((column) => {
      (kanban[column] ?? []).forEach((order) => {
        const branchId = order.shop?.id ?? 'unassigned';
        const group = groups.get(branchId) ?? {
          id: branchId,
          name: order.shop?.name ?? 'فرع غير محدد',
          columns: Object.fromEntries(columns.map((status) => [status, []])),
        };

        group.columns[column].push(order);
        groups.set(branchId, group);
      });
    });

    return [...groups.values()].sort((first, second) =>
      first.name.localeCompare(second.name, 'ar'),
    );
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
      contentContainerStyle={[styles.content, Platform.OS === 'web' ? styles.webContent : null]}
    >
      <Text style={styles.heading}>لوحة الإنتاج</Text>
      {branchGroups.length ? (
        branchGroups.map((branch) => (
          <View key={branch.id} style={styles.branchSection}>
            <Text style={styles.branchTitle}>{branch.name}</Text>
            <View
              style={[
                styles.branchColumns,
                Platform.OS === 'web' ? styles.webBranchColumns : null,
              ]}
            >
              {columns.map((column) => (
                <View key={column} style={styles.columnCard}>
                  <Text style={styles.columnTitle}>{orderStatusLabel(column)}</Text>
                  {branch.columns[column].length ? (
                    branch.columns[column].map((order) => (
                      <View key={order.id} style={styles.orderCard}>
                        <Text style={styles.orderTitle}>{order.orderNumber}</Text>
                        <Text style={styles.orderText}>{order.customerName}</Text>
                        {order.items?.some((item) => item.itemKind === 'Mold') ? (
                          <Text style={styles.moldSummary}>
                            {order.items
                              .filter((item) => item.itemKind === 'Mold')
                              .map((item) =>
                                moldConfigurationLabel(item.moldFlavor, item.moldColor),
                              )
                              .join('، ')}
                          </Text>
                        ) : null}
                        <Text style={styles.orderText}>
                          مكان التسليم: {order.moldDeliveryShop?.name ?? 'غير محدد'}
                        </Text>
                        <Text style={[styles.orderText, order.isUrgent ? styles.urgent : null]}>
                          {order.isUrgent ? 'عاجل' : 'عادي'}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyColumn}>لا توجد طلبات</Text>
                  )}
                </View>
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
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg },
  webContent: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
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
  branchTitle: {
    ...theme.typography.heading,
    color: theme.colors.primary,
    textAlign: 'right',
    borderRightWidth: 4,
    borderRightColor: theme.colors.primary,
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  branchColumns: {
    gap: theme.spacing.md,
  },
  webBranchColumns: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  columnCard: {
    flexGrow: 1,
    flexBasis: 260,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  columnTitle: {
    ...theme.typography.title,
    color: theme.colors.primary,
    textAlign: 'right',
  },
  orderCard: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: theme.spacing.md,
    gap: 2,
  },
  orderTitle: {
    ...theme.typography.label,
    color: theme.colors.primary,
    textAlign: 'right',
  },
  orderText: {
    ...theme.typography.body,
    color: theme.colors.onSurface,
    textAlign: 'right',
  },
  urgent: {
    color: theme.colors.error,
  },
  moldSummary: {
    ...theme.typography.body,
    color: theme.colors.primary,
    textAlign: 'right',
  },
  emptyColumn: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
  },
  emptyState: {
    ...theme.typography.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    width: '100%',
  },
});
