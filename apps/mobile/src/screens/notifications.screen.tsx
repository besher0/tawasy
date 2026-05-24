import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../lib/api';
import theme from '../theme';
import { StatusBadge } from '../components/status-badge';

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  const load = async () => {
    const response = await api.get('/notifications');
    setNotifications(response.data);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleRead = async (item: NotificationRow) => {
    await api.patch(`/notifications/${item.id}/read`, { isRead: !item.isRead });
    await load();
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.heading}>الإشعارات</Text>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => void toggleRead(item)}>
            <View style={styles.rowBetween}>
              <Text style={styles.title}>{item.title}</Text>
              <StatusBadge label={item.isRead ? 'مقروءة' : 'جديدة'} tone={item.isRead ? 'neutral' : 'primary'} />
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: theme.colors.surface, paddingTop: theme.spacing.lg },
  heading: {
    ...theme.typography.heading,
    color: theme.colors.onSurface,
    textAlign: 'right',
    paddingHorizontal: theme.spacing.lg,
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },
  list: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    padding: theme.spacing.md,
    gap: 4,
  },
  rowBetween: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { ...theme.typography.title, color: theme.colors.onSurface, textAlign: 'right', flexShrink: 1 },
  body: { ...theme.typography.body, color: theme.colors.onSurfaceVariant, textAlign: 'right' },
  meta: { ...theme.typography.label, color: theme.colors.onSurfaceVariant, textAlign: 'right' },
});
