import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../lib/api';
import theme from '../theme';
import { essentialsCategoryLabel, essentialsStatusLabel } from '../lib/labels';

interface EssentialRow {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  status: string;
}

export function NextDayEssentialsScreen() {
  const [list, setList] = useState<EssentialRow[]>([]);
  const [shopId, setShopId] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('10');

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
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await api.post('/daily-essentials', {
        shopId,
        category: 'Supplies',
        itemName,
        quantity: Number(quantity),
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
        <TextInput style={styles.input} value={shopId} onChangeText={setShopId} placeholder="معرّف الفرع" />
        <TextInput style={styles.input} value={itemName} onChangeText={setItemName} placeholder="اسم المادة" />
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          placeholder="الكمية"
        />
        <TouchableOpacity style={styles.button} onPress={addItem}>
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
  input: {
    height: 44,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    paddingHorizontal: theme.spacing.md,
    textAlign: 'right',
  },
  button: {
    height: 44,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
