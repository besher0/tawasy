import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UserRole } from '@sugarprecision/shared-types';
import type { ShopSummary } from '@sugarprecision/shared-types';
import api from '../lib/api';
import { getApiErrorMessage } from '../lib/api-error';
import { printReport } from '../lib/print-report';
import theme from '../theme';
import { useAuth } from '../context/auth-context';
import {
  essentialsCategoryLabel,
  moldConfigurationLabel,
} from '../lib/labels';
import { RootStackParamList } from '../navigation/types';

interface EssentialRow {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  notes?: string | null;
  shop?: {
    id: string;
    name: string;
  } | null;
}

interface TomorrowOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  deliveryDatetime: string;
  isUrgent: boolean;
  items?: {
    id: string;
    itemKind: string;
    moldFlavor?: string | null;
    moldInnerColor?: string | null;
    moldColor?: string | null;
  }[];
  shop?: {
    id: string;
    name: string;
  } | null;
}

interface DailyBranchGroup {
  id: string;
  name: string;
  orders: TomorrowOrder[];
  essentials: EssentialRow[];
}

const shopScopedRoles = new Set<string>([UserRole.SHOP_MANAGER, UserRole.SHOP_EMPLOYEE]);

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return getDateKey(date);
}

function buildDayOptions() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);

    return {
      dateKey: getDateKey(date),
      dayLabel:
        index === 0
          ? 'اليوم'
          : index === 1
            ? 'غداً'
            : date.toLocaleDateString('ar-SY', { weekday: 'long' }),
      dateLabel: date.toLocaleDateString('ar-SY', {
        day: 'numeric',
        month: 'short',
      }),
    };
  });
}

export function NextDayEssentialsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [list, setList] = useState<EssentialRow[]>([]);
  const [orders, setOrders] = useState<TomorrowOrder[]>([]);
  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [notes, setNotes] = useState('');
  const [exporting, setExporting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTomorrowDate);
  const dayOptions = useMemo(() => buildDayOptions(), []);
  const selectedDay = dayOptions.find((day) => day.dateKey === selectedDate);

  const isShopScoped = shopScopedRoles.has(user?.role ?? '');
  const writableShopId = selectedShopId;
  const canCreate = Boolean(writableShopId);
  const selectedShop = shops.find((shop) => shop.id === writableShopId);
  const branchGroups = useMemo(() => {
    const groups = new Map<string, DailyBranchGroup>();

    orders.forEach((order) => {
      const branchId = order.shop?.id ?? 'unassigned';
      const group = groups.get(branchId) ?? {
        id: branchId,
        name: order.shop?.name ?? 'فرع غير محدد',
        orders: [],
        essentials: [],
      };

      group.orders.push(order);
      groups.set(branchId, group);
    });

    list.forEach((item) => {
      const branchId = item.shop?.id ?? 'unassigned';
      const group = groups.get(branchId) ?? {
        id: branchId,
        name: item.shop?.name ?? 'فرع غير محدد',
        orders: [],
        essentials: [],
      };

      group.essentials.push(item);
      groups.set(branchId, group);
    });

    return [...groups.values()].sort((first, second) =>
      first.name.localeCompare(second.name, 'ar'),
    );
  }, [list, orders]);

  const branchLabel = useMemo(() => {
    if (selectedShop) {
      return `سيتم ربط المستلزم بفرع: ${selectedShop.name}`;
    }

    return isShopScoped
      ? 'حسابك غير مرتبط بفرع صالح.'
      : 'اختر الفرع الذي يحتاج هذه المستلزمات.';
  }, [isShopScoped, selectedShop]);

  const load = useCallback(async () => {
    const [essentialsResponse, ordersResponse] = await Promise.all([
      api.get('/daily-essentials', {
        params: { targetDate: selectedDate },
      }),
      api.get<TomorrowOrder[]>('/orders', {
        params: { date: selectedDate },
      }),
    ]);

    setList(essentialsResponse.data);
    setOrders(ordersResponse.data);
  }, [selectedDate]);

  useEffect(() => {
    async function initialize() {
      try {
        const response = await api.get<ShopSummary[]>('/shops', {
          params: { type: 'Branch' },
        });
        const branches = response.data ?? [];
        const accountShop = user?.shopId
          ? branches.find((shop) => shop.id === user.shopId)
          : undefined;
        const defaultShopId = isShopScoped
          ? accountShop?.id ?? ''
          : branches[0]?.id ?? '';

        setShops(branches);
        setSelectedShopId(defaultShopId);
      } catch (error) {
        Alert.alert(
          'خطأ',
          getApiErrorMessage(error, 'تعذر تحميل الفروع.'),
        );
      }
    }

    void initialize();
  }, [isShopScoped, user?.shopId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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
      await api.post('/daily-essentials', {
        ...(!isShopScoped ? { shopId: writableShopId } : {}),
        category: 'Supplies',
        itemName: itemName.trim(),
        quantity: normalizedQuantity,
        targetDate: selectedDate,
        status: 'Pending',
        notes: notes.trim() || undefined,
      });

      setItemName('');
      setNotes('');
      await load();
    } catch (error) {
      Alert.alert(
        'خطأ',
        getApiErrorMessage(error, 'تعذر إضافة المادة.'),
      );
    }
  };

  const exportEssentials = async () => {
    try {
      setExporting(true);
      const branchGroups = new Map<string, EssentialRow[]>();
      list.forEach((item) => {
        const branchName = item.shop?.name ?? 'فرع غير محدد';
        branchGroups.set(branchName, [
          ...(branchGroups.get(branchName) ?? []),
          item,
        ]);
      });

      await printReport({
        title: 'التواصي اليومية حسب الفروع',
        subtitle: `التاريخ: ${new Date(`${selectedDate}T12:00:00`).toLocaleDateString('ar-SY')}`,
        fileName: `daily-essentials-${selectedDate}.pdf`,
        sections: [...branchGroups.entries()].map(([branchName, essentials]) => ({
          title: branchName,
          items: essentials.map((item) => ({
            title: item.itemName,
            lines: [
              `الكمية: ${item.quantity}`,
              `الفئة: ${essentialsCategoryLabel(item.category)}`,
              item.notes ? `ملاحظة: ${item.notes}` : '',
            ],
          })),
        })),
      });
    } catch {
      Alert.alert('خطأ', 'تعذر فتح ملف طباعة التواصي.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.formCard}>
        <View style={styles.headingRow}>
          <Text style={styles.heading}>الطلبيات حسب اليوم</Text>
          <TouchableOpacity
            style={[styles.exportButton, exporting ? styles.buttonDisabled : null]}
            onPress={() => void exportEssentials()}
            disabled={exporting}
          >
            <MaterialIcons name="picture-as-pdf" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.exportButtonText}>
              {exporting ? 'جاري التحضير...' : 'طباعة / حفظ التواصي PDF'}
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayOptions}
        >
          {dayOptions.map((day) => {
            const active = selectedDate === day.dateKey;

            return (
              <TouchableOpacity
                key={day.dateKey}
                style={[styles.dayChip, active ? styles.dayChipActive : null]}
                onPress={() => setSelectedDate(day.dateKey)}
              >
                <Text style={[styles.dayChipTitle, active ? styles.dayChipTextActive : null]}>
                  {day.dayLabel}
                </Text>
                <Text style={[styles.dayChipDate, active ? styles.dayChipTextActive : null]}>
                  {day.dateLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <Text style={styles.helper}>{branchLabel}</Text>
        {!isShopScoped ? (
          <View style={styles.shopOptions}>
            {shops.map((shop) => {
              const active = selectedShopId === shop.id;
              return (
                <TouchableOpacity
                  key={shop.id}
                  style={[styles.shopChip, active ? styles.shopChipActive : null]}
                  onPress={() => setSelectedShopId(shop.id)}
                >
                  <Text style={[styles.shopChipText, active ? styles.shopChipTextActive : null]}>
                    {shop.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
        <TextInput style={styles.input} value={itemName} onChangeText={setItemName} placeholder="اسم المادة" />
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          placeholder="الكمية"
        />
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="ملاحظة الطلبية"
          multiline
          textAlign="right"
          textAlignVertical="top"
        />
        <TouchableOpacity style={[styles.button, !canCreate ? styles.buttonDisabled : null]} onPress={addItem}>
          <Text style={styles.buttonText}>إضافة</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={branchGroups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.dayResultsTitle}>
            تفاصيل {selectedDay?.dayLabel ?? selectedDate} حسب الفروع
          </Text>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>لا توجد طلبيات أو مستلزمات في هذا اليوم.</Text>
        }
        renderItem={({ item: branch }) => (
          <View style={styles.branchSection}>
            {!isShopScoped ? (
              <View style={styles.branchHeader}>
                <Text style={styles.branchTitle}>{branch.name}</Text>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>طلبات التسليم</Text>
            {branch.orders.length ? (
              branch.orders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderCard}
                  onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
                >
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                    <Text style={order.isUrgent ? styles.urgent : styles.itemMeta}>
                      {order.isUrgent ? 'عاجل' : 'عادي'}
                    </Text>
                  </View>
                  <Text style={styles.itemName}>{order.customerName}</Text>
                  {order.items?.some((item) => item.itemKind === 'Mold') ? (
                    <Text style={styles.moldSummary}>
                      القوالب:{' '}
                      {order.items
                        .filter((item) => item.itemKind === 'Mold')
                        .map((item) =>
                          moldConfigurationLabel(
                            item.moldFlavor,
                            item.moldColor,
                            item.moldInnerColor,
                          ),
                        )
                        .join('، ')}
                    </Text>
                  ) : null}
                  <Text style={styles.itemMeta}>
                    الفرع: {order.shop?.name ?? 'غير محدد'}
                  </Text>
                  <Text style={styles.itemMeta}>
                    الموعد: {new Date(order.deliveryDatetime).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>لا توجد طلبات تسليم لهذا الفرع.</Text>
            )}

            <Text style={styles.sectionTitle}>المستلزمات</Text>
            {branch.essentials.length ? (
              branch.essentials.map((essential) => (
                <View key={essential.id} style={styles.card}>
                  <Text style={styles.itemName}>{essential.itemName}</Text>
                  <Text style={styles.itemMeta}>
                    الفئة: {essentialsCategoryLabel(essential.category)}
                  </Text>
                  <Text style={styles.itemMeta}>الكمية: {essential.quantity}</Text>
                  {essential.notes ? (
                    <Text style={styles.notesText}>ملاحظة: {essential.notes}</Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>لا توجد مستلزمات لهذا الفرع.</Text>
            )}
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
  headingRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  exportButton: {
    minHeight: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  exportButtonText: {
    ...theme.typography.label,
    color: theme.colors.onPrimary,
    fontFamily: 'Cairo_700Bold',
  },
  helper: { ...theme.typography.label, color: theme.colors.onSurfaceVariant, textAlign: 'right' },
  dayOptions: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  dayChip: {
    width: 92,
    minHeight: 62,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  dayChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.secondaryContainer,
  },
  dayChipTitle: {
    ...theme.typography.label,
    color: theme.colors.onSurface,
  },
  dayChipDate: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
  },
  dayChipTextActive: {
    color: theme.colors.primary,
    fontFamily: 'Cairo_700Bold',
  },
  shopOptions: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  shopChip: {
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  shopChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.secondaryContainer,
  },
  shopChipText: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
  },
  shopChipTextActive: {
    color: theme.colors.primary,
  },
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
  notesInput: {
    minHeight: 76,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
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
    opacity: 0.65,
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
  dayResultsTitle: {
    ...theme.typography.title,
    color: theme.colors.onSurface,
    textAlign: 'right',
    marginBottom: theme.spacing.sm,
  },
  branchSection: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  branchHeader: {
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
  sectionTitle: {
    ...theme.typography.title,
    color: theme.colors.primary,
    textAlign: 'right',
    marginTop: theme.spacing.sm,
  },
  orderCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    padding: theme.spacing.md,
    gap: 2,
  },
  orderHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    ...theme.typography.title,
    color: theme.colors.primary,
  },
  urgent: {
    ...theme.typography.label,
    color: theme.colors.error,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
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
  notesText: {
    ...theme.typography.body,
    color: theme.colors.onSurface,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    textAlign: 'right',
  },
  moldSummary: { ...theme.typography.body, color: theme.colors.primary, textAlign: 'right' },
});
