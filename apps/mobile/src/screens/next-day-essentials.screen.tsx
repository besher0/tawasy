import React, { useEffect, useMemo, useState } from 'react';
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
import api from '../lib/api';
import theme from '../theme';
import { useAuth } from '../context/auth-context';
import { essentialsCategoryLabel, essentialsStatusLabel } from '../lib/labels';

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

const shopScopedRoles = new Set<string>([UserRole.SHOP_MANAGER, UserRole.SHOP_EMPLOYEE]);

export function NextDayEssentialsScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<EssentialRow[]>([]);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('10');

  const isShopScoped = shopScopedRoles.has(user?.role ?? '');
  const canCreate = !isShopScoped || Boolean(user?.shopId);

  const branchLabel = useMemo(() => {
    if (!isShopScoped) {
      return 'يتم عرض مستلزمات كل الفروع حسب الصلاحيات.';
    }

    return user?.shopId ? `سيتم ربط الطلب بفرع حسابك تلقائياً: ${user.shopId}` : 'حسابك غير مرتبط بفرع.';
  }, [isShopScoped, user?.shopId]);

  const load = async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const response = await api.get('/daily-essentials', {
      params: { targetDate: tomorrow.toISOString() },
    });
    setList(response.data);
  };

  useEffect(() => {
    void load();
  }, []);

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
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await api.post('/daily-essentials', {
        category: 'Supplies',
        itemName: itemName.trim(),
        quantity: normalizedQuantity,
        targetDate: tomorrow.toISOString(),
        status: 'Pending',
      });

      setItemName('');
      await load();
    } catch {
      Alert.alert('خطأ', 'تعذر إضافة المادة');
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.formCard}>
        <Text style={styles.heading}>طلبيات اليوم التالي</Text>
        <Text style={styles.helper}>{branchLabel}</Text>
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
