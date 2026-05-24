import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../lib/api';
import theme from '../theme';

export function NewOrderScreen() {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryDatetime, setDeliveryDatetime] = useState('2026-06-01T16:00:00.000Z');
  const [totalPrice, setTotalPrice] = useState('1250');
  const [depositAmount, setDepositAmount] = useState('500');
  const [shopId, setShopId] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    const asset = result.assets[0];
    const form = new FormData();
    form.append('file', {
      uri: asset.uri,
      name: asset.fileName ?? `reference-${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    } as never);

    const response = await api.post('/uploads/order-reference', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    setReferenceImages((prev) => [...prev, response.data.url]);
  };

  const submit = async () => {
    try {
      await api.post('/orders', {
        shopId,
        customerName,
        customerPhone,
        deliveryDatetime,
        totalPrice: Number(totalPrice),
        depositAmount: Number(depositAmount),
        paymentStatus: 'Partial',
        isUrgent,
        notes: '',
        items: [
          {
            cakeType: 'Cake',
            layers: 2,
            shape: 'Round',
            filling: 'Chocolate Hazelnut',
            specialDetails: '',
            peopleCount: 12,
            referenceImages,
          },
        ],
      });

      Alert.alert('ط·ع¾ط¸â€¦', 'ط·ع¾ط¸â€¦ ط·آ¥ط¸â€ ط·آ´ط·آ§ط·طŒ ط·آ§ط¸â€‍ط·آ·ط¸â€‍ط·آ¨ ط·آ¨ط¸â€ ط·آ¬ط·آ§ط·آ­');
      setCustomerName('');
      setCustomerPhone('');
      setReferenceImages([]);
    } catch (error) {
      Alert.alert('ط·آ®ط·آ·ط·آ£', 'ط¸ظ¾ط·آ´ط¸â€‍ ط·آ¥ط¸â€ ط·آ´ط·آ§ط·طŒ ط·آ§ط¸â€‍ط·آ·ط¸â€‍ط·آ¨. ط·ع¾ط·آ­ط¸â€ڑط¸â€ڑ ط¸â€¦ط¸â€  ط·آ§ط¸â€‍ط·آ¨ط¸ظ¹ط·آ§ط¸â€ ط·آ§ط·ع¾.');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>ط·آ¥ط¸â€ ط·آ´ط·آ§ط·طŒ ط·آ·ط¸â€‍ط·آ¨ ط·آ¬ط·آ¯ط¸ظ¹ط·آ¯</Text>

      <View style={styles.card}>
        <Text style={styles.label}>ط¸â€¦ط·آ¹ط·آ±ط¸ظ¾ ط·آ§ط¸â€‍ط¸ظ¾ط·آ±ط·آ¹ (shopId)</Text>
        <TextInput style={styles.input} value={shopId} onChangeText={setShopId} placeholder="shop-uuid" />

        <Text style={styles.label}>ط·آ§ط·آ³ط¸â€¦ ط·آ§ط¸â€‍ط·آ¹ط¸â€¦ط¸ظ¹ط¸â€‍</Text>
        <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} />

        <Text style={styles.label}>ط·آ±ط¸â€ڑط¸â€¦ ط·آ§ط¸â€‍ط¸â€،ط·آ§ط·ع¾ط¸ظ¾</Text>
        <TextInput style={styles.input} value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" />

        <Text style={styles.label}>ط¸â€¦ط¸ث†ط·آ¹ط·آ¯ ط·آ§ط¸â€‍ط·ع¾ط·آ³ط¸â€‍ط¸ظ¹ط¸â€¦ (ISO)</Text>
        <TextInput style={styles.input} value={deliveryDatetime} onChangeText={setDeliveryDatetime} />

        <Text style={styles.label}>ط·آ§ط¸â€‍ط·آ¥ط·آ¬ط¸â€¦ط·آ§ط¸â€‍ط¸ظ¹</Text>
        <TextInput style={styles.input} value={totalPrice} onChangeText={setTotalPrice} keyboardType="numeric" />

        <Text style={styles.label}>ط·آ§ط¸â€‍ط·آ¹ط·آ±ط·آ¨ط¸ث†ط¸â€ </Text>
        <TextInput style={styles.input} value={depositAmount} onChangeText={setDepositAmount} keyboardType="numeric" />

        <TouchableOpacity style={styles.secondaryButton} onPress={() => setIsUrgent((prev) => !prev)}>
          <Text style={styles.secondaryButtonText}>ط·آ§ط¸â€‍ط·آ­ط·آ§ط¸â€‍ط·آ©: {isUrgent ? 'ط·آ¹ط·آ§ط·آ¬ط¸â€‍' : 'ط·آ¹ط·آ§ط·آ¯ط¸ظ¹'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={pickImage}>
          <Text style={styles.secondaryButtonText}>ط·آ±ط¸ظ¾ط·آ¹ ط·آµط¸ث†ط·آ±ط·آ© ط¸â€¦ط·آ±ط·آ¬ط·آ¹ط¸ظ¹ط·آ©</Text>
        </TouchableOpacity>
        <Text style={styles.note}>ط·آ¹ط·آ¯ط·آ¯ ط·آ§ط¸â€‍ط·آµط¸ث†ط·آ±: {referenceImages.length}</Text>

        <TouchableOpacity style={styles.primaryButton} onPress={submit}>
          <Text style={styles.primaryButtonText}>ط·آ¥ط·آ±ط·آ³ط·آ§ط¸â€‍ ط·آ§ط¸â€‍ط·آ·ط¸â€‍ط·آ¨ ط¸â€‍ط¸â€‍ط¸â€¦ط·آµط¸â€ ط·آ¹</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg },
  heading: { ...theme.typography.heading, color: theme.colors.onSurface, textAlign: 'right' },
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  label: { ...theme.typography.label, color: theme.colors.onSurfaceVariant, textAlign: 'right' },
  input: {
    height: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    textAlign: 'right',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    marginTop: theme.spacing.sm,
  },
  primaryButtonText: {
    ...theme.typography.title,
    color: theme.colors.onPrimary,
  },
  secondaryButton: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    ...theme.typography.body,
    color: theme.colors.onSurface,
  },
  note: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
  },
});
