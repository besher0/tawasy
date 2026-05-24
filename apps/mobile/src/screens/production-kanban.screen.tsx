import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import api from '../lib/api';
import theme from '../theme';

const columns = ['New', 'Reviewing', 'In_Production', 'Ready'];

export function ProductionKanbanScreen() {
  const [kanban, setKanban] = useState<Record<string, Array<{ id: string; orderNumber: string; customerName: string; isUrgent: boolean }>>>({});

  useEffect(() => {
    async function loadKanban() {
      const response = await api.get('/production/kanban');
      setKanban(response.data.columns ?? {});
    }

    void loadKanban();
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>ط¸â€‍ط¸ث†ط·آ­ط·آ© ط·آ§ط¸â€‍ط·آ¥ط¸â€ ط·ع¾ط·آ§ط·آ¬</Text>
      {columns.map((column) => (
        <View key={column} style={styles.columnCard}>
          <Text style={styles.columnTitle}>{column}</Text>
          {(kanban[column] ?? []).map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <Text style={styles.orderTitle}>{order.orderNumber}</Text>
              <Text style={styles.orderText}>{order.customerName}</Text>
              <Text style={[styles.orderText, order.isUrgent ? styles.urgent : null]}>
                {order.isUrgent ? 'ط·آ¹ط·آ§ط·آ¬ط¸â€‍' : 'ط·آ¹ط·آ§ط·آ¯ط¸ظ¹'}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg },
  heading: {
    ...theme.typography.heading,
    color: theme.colors.onSurface,
    textAlign: 'right',
  },
  columnCard: {
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
});