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
      Alert.alert('ط·آ®ط·آ·ط·آ£', 'ط·ع¾ط·آ¹ط·آ°ط·آ± ط·آ¥ط·آ¶ط·آ§ط¸ظ¾ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ§ط·آ¯ط·آ©');
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.formCard}>
        <Text style={styles.heading}>ط·آ·ط¸â€‍ط·آ¨ط¸ظ¹ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط¸ظ¹ط¸ث†ط¸â€¦ ط·آ§ط¸â€‍ط·ع¾ط·آ§ط¸â€‍ط¸ظ¹</Text>
        <TextInput style={styles.input} value={shopId} onChangeText={setShopId} placeholder="shop-uuid" />
        <TextInput style={styles.input} value={itemName} onChangeText={setItemName} placeholder="ط·آ§ط·آ³ط¸â€¦ ط·آ§ط¸â€‍ط¸â€¦ط·آ§ط·آ¯ط·آ©" />
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          placeholder="ط·آ§ط¸â€‍ط¸ئ’ط¸â€¦ط¸ظ¹ط·آ©"
        />
        <TouchableOpacity style={styles.button} onPress={addItem}>
          <Text style={styles.buttonText}>ط·آ¥ط·آ¶ط·آ§ط¸ظ¾ط·آ©</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.itemName}>{item.itemName}</Text>
            <Text style={styles.itemMeta}>ط·آ§ط¸â€‍ط¸ظ¾ط·آ¦ط·آ©: {item.category}</Text>
            <Text style={styles.itemMeta}>ط·آ§ط¸â€‍ط¸ئ’ط¸â€¦ط¸ظ¹ط·آ©: {item.quantity}</Text>
            <Text style={styles.itemMeta}>ط·آ§ط¸â€‍ط·آ­ط·آ§ط¸â€‍ط·آ©: {item.status}</Text>
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
  list: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xxl, gap: theme.spacing.sm },
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