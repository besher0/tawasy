import {
  CakeShape,
  CakeType,
  PaymentStatus,
  UserRole,
} from '@sugarprecision/shared-types';
import type { CreateOrderInput, ShopSummary } from '@sugarprecision/shared-types';
import React, { useEffect, useMemo, useState } from 'react';
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
import { cakeShapeLabel, cakeTypeLabel } from '../lib/labels';
import api from '../lib/api';
import { getApiErrorMessage } from '../lib/api-error';
import { useAuth } from '../context/auth-context';
import theme from '../theme';

type DraftOrderItem = {
  id: string;
  cakeType: CakeType;
  layers: number;
  shape: CakeShape;
  filling: string;
  peopleCount: number;
  specialDetails: string;
  referenceImages: string[];
};

let orderItemCounter = 0;

const cakeTypeOptions: CakeType[] = [
  CakeType.CAKE,
  CakeType.DUMMY,
  CakeType.COVERED,
  CakeType.UNCOVERED,
];

const cakeShapeOptions: CakeShape[] = [
  CakeShape.ROUND,
  CakeShape.SQUARE,
  CakeShape.HEART,
  CakeShape.CUSTOM,
];

const shopScopedRoles = new Set<UserRole>([
  UserRole.SHOP_MANAGER,
  UserRole.SHOP_EMPLOYEE,
]);

function buildDefaultDelivery() {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  date.setHours(16, 0, 0, 0);

  return {
    deliveryDate: date.toISOString().slice(0, 10),
    deliveryTime: date.toTimeString().slice(0, 5),
  };
}

function createEmptyItem(): DraftOrderItem {
  orderItemCounter += 1;

  return {
    id: `cake-${Date.now()}-${orderItemCounter}`,
    cakeType: CakeType.CAKE,
    layers: 1,
    shape: CakeShape.ROUND,
    filling: '',
    peopleCount: 12,
    specialDetails: '',
    referenceImages: [],
  };
}

export function NewOrderScreen() {
  const { user } = useAuth();
  const defaults = useMemo(() => buildDefaultDelivery(), []);
  const isShopScoped = user?.role ? shopScopedRoles.has(user.role) : false;

  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [shopId, setShopId] = useState('');
  const [moldDeliveryShopId, setMoldDeliveryShopId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(defaults.deliveryDate);
  const [deliveryTime, setDeliveryTime] = useState(defaults.deliveryTime);
  const [totalPrice, setTotalPrice] = useState('1250');
  const [depositAmount, setDepositAmount] = useState('500');
  const [notes, setNotes] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [items, setItems] = useState<DraftOrderItem[]>(() => [createEmptyItem()]);

  useEffect(() => {
    let active = true;

    async function loadShops() {
      try {
        const response = await api.get<ShopSummary[]>('/shops', {
          params: { type: 'Branch' },
        });

        if (!active) {
          return;
        }

        const branches = response.data ?? [];
        const userBranch = user?.shopId
          ? branches.find((shop) => shop.id === user.shopId)
          : undefined;
        const defaultBranchId = userBranch?.id ?? branches[0]?.id ?? '';

        setShops(branches);
        setShopId((current) => current || defaultBranchId);
        setMoldDeliveryShopId((current) => current || defaultBranchId);
      } catch {
        Alert.alert('خطأ', 'تعذر تحميل الفروع. تأكد أن الباكند يعمل ومتصل بقاعدة البيانات.');
      }
    }

    void loadShops();

    return () => {
      active = false;
    };
  }, [user?.shopId]);

  const accountShop = useMemo(() => {
    if (!user?.shopId) {
      return undefined;
    }

    return shops.find((shop) => shop.id === user.shopId);
  }, [shops, user?.shopId]);

  const orderBranchId = isShopScoped ? accountShop?.id ?? '' : shopId;

  const remainingAmount = useMemo(() => {
    const total = Number(totalPrice);
    const deposit = Number(depositAmount);

    if (!Number.isFinite(total) || !Number.isFinite(deposit)) {
      return 0;
    }

    return Math.max(total - deposit, 0);
  }, [depositAmount, totalPrice]);

  const updateItem = (itemId: string, updater: (item: DraftOrderItem) => DraftOrderItem) => {
    setItems((prev) => prev.map((item) => (item.id === itemId ? updater(item) : item)));
  };

  const pickImage = async (itemId: string) => {
    try {
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

      const imageUrl = response.data.url as string;
      updateItem(itemId, (item) => ({
        ...item,
        referenceImages: [...item.referenceImages, imageUrl],
      }));
    } catch {
      Alert.alert('خطأ', 'تعذر رفع الصورة المرجعية');
    }
  };

  const resetForm = () => {
    const fallbackBranchId = accountShop?.id ?? shops[0]?.id ?? '';

    setShopId(fallbackBranchId);
    setMoldDeliveryShopId(fallbackBranchId);
    setCustomerName('');
    setCustomerPhone('');
    setTotalPrice('1250');
    setDepositAmount('500');
    setNotes('');
    setIsUrgent(false);
    setItems([createEmptyItem()]);
    setDeliveryDate(defaults.deliveryDate);
    setDeliveryTime(defaults.deliveryTime);
  };

  const submit = async () => {
    if (!orderBranchId.trim()) {
      Alert.alert('تنبيه', 'لا يوجد فرع مربوط بهذا الحساب. راجع حساب المستخدم أو اختر فرع الطلب للمدير.');
      return;
    }

    if (!moldDeliveryShopId.trim()) {
      Alert.alert('تنبيه', 'اختر فرع تسليم القالب');
      return;
    }

    if (!customerName.trim()) {
      Alert.alert('تنبيه', 'أدخل اسم العميل');
      return;
    }

    if (!customerPhone.trim()) {
      Alert.alert('تنبيه', 'أدخل رقم الهاتف');
      return;
    }

    const delivery = new Date(`${deliveryDate}T${deliveryTime}:00`);
    if (Number.isNaN(delivery.getTime())) {
      Alert.alert('تنبيه', 'تاريخ أو وقت التسليم غير صالح');
      return;
    }

    const normalizedTotal = Number(totalPrice);
    const normalizedDeposit = Number(depositAmount);

    if (!Number.isFinite(normalizedTotal) || normalizedTotal < 0) {
      Alert.alert('تنبيه', 'الإجمالي غير صحيح');
      return;
    }

    if (!Number.isFinite(normalizedDeposit) || normalizedDeposit < 0) {
      Alert.alert('تنبيه', 'العربون غير صحيح');
      return;
    }

    if (normalizedDeposit > normalizedTotal) {
      Alert.alert('تنبيه', 'العربون لا يمكن أن يتجاوز الإجمالي');
      return;
    }

    const emptyItemIndex = items.findIndex((item) => !item.filling.trim());
    if (emptyItemIndex >= 0) {
      Alert.alert('تنبيه', `أدخل نوع الحشوة للكيك رقم ${emptyItemIndex + 1}`);
      return;
    }

    const paymentStatus =
      normalizedDeposit <= 0
        ? PaymentStatus.UNPAID
        : normalizedDeposit >= normalizedTotal
          ? PaymentStatus.PAID
          : PaymentStatus.PARTIAL;

    const payload: CreateOrderInput = {
      moldDeliveryShopId: moldDeliveryShopId.trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryDatetime: delivery.toISOString(),
      totalPrice: normalizedTotal,
      depositAmount: normalizedDeposit,
      paymentStatus,
      isUrgent,
      notes: notes.trim() || undefined,
      items: items.map((item) => ({
        cakeType: item.cakeType,
        layers: item.layers,
        shape: item.shape,
        filling: item.filling.trim(),
        specialDetails: item.specialDetails.trim() || undefined,
        peopleCount: item.peopleCount,
        referenceImages: item.referenceImages,
      })),
    };

    if (!isShopScoped) {
      payload.shopId = orderBranchId.trim();
    }

    try {
      await api.post('/orders', payload);
      Alert.alert('تم', 'تم إنشاء الطلب بنجاح');
      resetForm();
    } catch (error) {
      Alert.alert(
        'خطأ',
        getApiErrorMessage(error, 'فشل إنشاء الطلب. تحقق من البيانات ومكان تسليم القالب.'),
      );
    }
  };

  const renderShopSelector = (
    label: string,
    selectedId: string,
    options: ShopSummary[],
    onSelect: (id: string) => void,
    helperText?: string,
  ) => (
    <View style={styles.selectorBlock}>
      <Text style={styles.label}>{label}</Text>
      {helperText ? <Text style={styles.note}>{helperText}</Text> : null}
      <View style={styles.optionRow}>
        {options.length ? (
          options.map((shop) => {
            const active = selectedId === shop.id;
            return (
              <TouchableOpacity
                key={shop.id}
                style={[styles.shopChip, active && styles.shopChipActive]}
                onPress={() => onSelect(shop.id)}
              >
                <Text style={[styles.shopChipTitle, active && styles.shopChipTitleActive]}>{shop.name}</Text>
                <Text style={[styles.shopChipLocation, active && styles.shopChipLocationActive]}>
                  {shop.location}
                </Text>
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={styles.emptyText}>لا توجد فروع متاحة حالياً</Text>
        )}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>إنشاء طلب جديد</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>بيانات العميل والاستلام</Text>

        {isShopScoped ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>فرع تسجيل الطلب من حسابك</Text>
            <Text style={styles.infoValue}>{accountShop?.name ?? 'فرع الحساب الحالي'}</Text>
            <Text style={styles.note}>سيتم ربط الطلب بهذا الفرع تلقائياً ولا يمكن تغييره من شاشة الطلب.</Text>
          </View>
        ) : (
          renderShopSelector('فرع تسجيل الطلب', shopId, shops, setShopId, 'هذا الحقل يظهر للمدير فقط لأن حسابه غير مربوط بفرع واحد.')
        )}

        {renderShopSelector(
          'مكان تسليم القالب',
          moldDeliveryShopId,
          shops,
          setMoldDeliveryShopId,
          'اختر فرعاً موجوداً فقط. لا يتم قبول نص حر أو المعمل كمكان تسليم.',
        )}

        <Text style={styles.label}>اسم العميل</Text>
        <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} textAlign="right" />

        <Text style={styles.label}>رقم الهاتف</Text>
        <TextInput
          style={styles.input}
          value={customerPhone}
          onChangeText={setCustomerPhone}
          keyboardType="phone-pad"
          textAlign="right"
        />

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>وقت التسليم</Text>
            <TextInput
              style={styles.input}
              value={deliveryTime}
              onChangeText={setDeliveryTime}
              placeholder="16:00"
              textAlign="center"
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>تاريخ التسليم</Text>
            <TextInput
              style={styles.input}
              value={deliveryDate}
              onChangeText={setDeliveryDate}
              placeholder="YYYY-MM-DD"
              textAlign="center"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => setIsUrgent((prev) => !prev)}>
          <Text style={styles.secondaryButtonText}>{isUrgent ? 'طلب مستعجل' : 'طلب عادي'}</Text>
        </TouchableOpacity>
      </View>

      {items.map((item, index) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.itemHeader}>
            <Text style={styles.sectionTitle}>{`تفاصيل الكيك #${index + 1}`}</Text>
            {items.length > 1 ? (
              <TouchableOpacity
                onPress={() => setItems((prev) => prev.filter((entry) => entry.id !== item.id))}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteButtonText}>حذف</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={styles.label}>نوع الكيك</Text>
          <View style={styles.optionRow}>
            {cakeTypeOptions.map((option) => {
              const active = item.cakeType === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionChip, active && styles.optionChipActive]}
                  onPress={() => updateItem(item.id, (current) => ({ ...current, cakeType: option }))}
                >
                  <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                    {cakeTypeLabel(option)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>عدد الطوابق</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => updateItem(item.id, (current) => ({ ...current, layers: Math.max(1, current.layers - 1) }))}
            >
              <Text style={styles.stepperButtonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.stepperValue}
              value={String(item.layers)}
              keyboardType="numeric"
              onChangeText={(value) => updateItem(item.id, (current) => {
                const nextValue = Number(value);
                return Number.isFinite(nextValue) ? { ...current, layers: Math.max(1, Math.floor(nextValue)) } : current;
              })}
              textAlign="center"
            />
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => updateItem(item.id, (current) => ({ ...current, layers: current.layers + 1 }))}
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>عدد القطع / الأشخاص</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => updateItem(item.id, (current) => ({ ...current, peopleCount: Math.max(1, current.peopleCount - 1) }))}
            >
              <Text style={styles.stepperButtonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.stepperValue}
              value={String(item.peopleCount)}
              keyboardType="numeric"
              onChangeText={(value) => updateItem(item.id, (current) => {
                const nextValue = Number(value);
                return Number.isFinite(nextValue) ? { ...current, peopleCount: Math.max(1, Math.floor(nextValue)) } : current;
              })}
              textAlign="center"
            />
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => updateItem(item.id, (current) => ({ ...current, peopleCount: current.peopleCount + 1 }))}
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>شكل الكيك</Text>
          <View style={styles.optionRow}>
            {cakeShapeOptions.map((option) => {
              const active = item.shape === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionChip, active && styles.optionChipActive]}
                  onPress={() => updateItem(item.id, (current) => ({ ...current, shape: option }))}
                >
                  <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                    {cakeShapeLabel(option)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>نوع الحشوة</Text>
          <TextInput
            style={styles.input}
            value={item.filling}
            onChangeText={(value) => updateItem(item.id, (current) => ({ ...current, filling: value }))}
            placeholder="مثال: شوكولاتة بالبندق"
            textAlign="right"
          />

          <Text style={styles.label}>الإضافات والتفاصيل الخاصة</Text>
          <TextInput
            style={styles.textArea}
            value={item.specialDetails}
            onChangeText={(value) => updateItem(item.id, (current) => ({ ...current, specialDetails: value }))}
            placeholder="الكتابة على الكيك، لون محدد، إضافات خاصة..."
            multiline
            textAlign="right"
            textAlignVertical="top"
          />

          <TouchableOpacity style={styles.secondaryButton} onPress={() => void pickImage(item.id)}>
            <Text style={styles.secondaryButtonText}>رفع صورة مرجعية</Text>
          </TouchableOpacity>
          <Text style={styles.note}>عدد الصور: {item.referenceImages.length}</Text>
        </View>
      ))}

      <TouchableOpacity style={styles.addButton} onPress={() => setItems((prev) => [...prev, createEmptyItem()])}>
        <Text style={styles.addButtonText}>إضافة كيك آخر للطلب</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>الحساب والمدفوعات</Text>

        <Text style={styles.label}>الإجمالي</Text>
        <TextInput
          style={styles.input}
          value={totalPrice}
          onChangeText={setTotalPrice}
          keyboardType="numeric"
          textAlign="right"
        />

        <Text style={styles.label}>العربون</Text>
        <TextInput
          style={styles.input}
          value={depositAmount}
          onChangeText={setDepositAmount}
          keyboardType="numeric"
          textAlign="right"
        />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryTitle}>المتبقي</Text>
          <Text style={styles.summaryValue}>{remainingAmount.toFixed(2)} ر.س</Text>
        </View>

        <Text style={styles.label}>ملاحظات الطلب</Text>
        <TextInput
          style={styles.textArea}
          value={notes}
          onChangeText={setNotes}
          placeholder="أي ملاحظات عامة على الطلب..."
          multiline
          textAlign="right"
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.primaryButton} onPress={() => void submit()}>
          <Text style={styles.primaryButtonText}>إرسال الطلب للمصنع</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },
  heading: {
    ...theme.typography.heading,
    color: theme.colors.onSurface,
    textAlign: 'right',
  },
  sectionTitle: {
    ...theme.typography.title,
    color: theme.colors.primary,
    textAlign: 'right',
  },
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  deleteButton: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  deleteButtonText: {
    ...theme.typography.label,
    color: theme.colors.error,
  },
  selectorBlock: {
    gap: theme.spacing.xs,
  },
  infoBox: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.secondaryContainer,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  infoTitle: {
    ...theme.typography.label,
    color: theme.colors.primary,
    textAlign: 'right',
  },
  infoValue: {
    ...theme.typography.title,
    color: theme.colors.onSurface,
    textAlign: 'right',
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row-reverse',
    gap: theme.spacing.sm,
  },
  halfField: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  input: {
    height: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.onSurface,
    ...theme.typography.body,
  },
  textArea: {
    minHeight: 96,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.onSurface,
    ...theme.typography.body,
  },
  optionRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  optionChip: {
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  optionChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.secondaryContainer,
  },
  optionChipText: {
    ...theme.typography.body,
    color: theme.colors.onSurfaceVariant,
  },
  optionChipTextActive: {
    color: theme.colors.primary,
    fontFamily: 'Cairo_600SemiBold',
  },
  shopChip: {
    minWidth: 180,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    gap: 2,
  },
  shopChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.secondaryContainer,
  },
  shopChipTitle: {
    ...theme.typography.title,
    color: theme.colors.onSurface,
    textAlign: 'right',
  },
  shopChipTitleActive: {
    color: theme.colors.primary,
  },
  shopChipLocation: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
  },
  shopChipLocationActive: {
    color: theme.colors.primary,
  },
  stepper: {
    flexDirection: 'row-reverse',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  stepperButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  stepperButtonText: {
    ...theme.typography.title,
    color: theme.colors.onSurface,
  },
  stepperValue: {
    flex: 1,
    height: 48,
    ...theme.typography.title,
    color: theme.colors.onSurface,
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
    backgroundColor: theme.colors.surfaceContainerLowest,
  },
  secondaryButtonText: {
    ...theme.typography.body,
    color: theme.colors.onSurface,
  },
  addButton: {
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  addButtonText: {
    ...theme.typography.title,
    color: theme.colors.primary,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.error,
    textAlign: 'right',
  },
  note: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
  },
  summaryRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    ...theme.typography.title,
    color: theme.colors.onSurface,
  },
  summaryValue: {
    ...theme.typography.title,
    color: theme.colors.primary,
  },
});
