import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { ShopType, UserRole } from '@sugarprecision/shared-types';
import type { ShopSummary } from '@sugarprecision/shared-types';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../context/auth-context';
import theme from '../theme';
import api from '../lib/api';
import { getApiErrorMessage } from '../lib/api-error';
import { printReport } from '../lib/print-report';
import { StatusBadge } from '../components/status-badge';
import {
  DeliveryDatePicker,
  formatDeliveryDate,
} from '../components/delivery-date-time-picker';
import { orderStatusLabel } from '../lib/labels';
import { buildOrderItemDisplay } from '../lib/order-item-details';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];
type CancellationFilter = 'all' | 'active' | 'cancelled';

interface OrderItemPreview {
  id: string;
  itemKind: string;
  pieceType?: string | null;
  hasTopDecoration?: boolean;
  cakeType?: string | null;
  layers?: number;
  shape?: string | null;
  moldFlavor?: string | null;
  moldInnerColor?: string | null;
  moldLayerColors?: string | null;
  moldColor?: string | null;
  hasFillings?: boolean;
  filling?: string | null;
  withFoam?: boolean;
  foamCount?: number | null;
  finishType?: string | null;
  specialDetails?: string | null;
  writingText?: string | null;
  peopleCount?: number;
  referenceImages?: string[];
}

interface OrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  deliveryDatetime: string;
  status: string;
  isUrgent: boolean;
  notes?: string | null;
  items?: OrderItemPreview[];
  shop?: {
    id: string;
    name: string;
  } | null;
  moldDeliveryShop?: {
    name: string;
    location: string;
  } | null;
}

interface OrderSection {
  title: string;
  dateKey: string;
  branchKey: string;
  branchName: string;
  showBranchHeader: boolean;
  data: OrderRow[];
}

const cancellationFilterOptions: Array<{
  value: CancellationFilter;
  label: string;
  icon: MaterialIconName;
}> = [
  { value: 'all', label: 'كل الطلبات', icon: 'list' },
  { value: 'active', label: 'غير ملغي', icon: 'check-circle' },
  { value: 'cancelled', label: 'ملغي', icon: 'cancel' },
];

function getLocalDateKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDayTitle(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  const today = getLocalDateKey(new Date().toISOString());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = getLocalDateKey(tomorrowDate.toISOString());

  const prefix =
    dateKey === today
      ? 'اليوم'
      : dateKey === tomorrow
        ? 'غداً'
        : date.toLocaleDateString('ar-SY', { weekday: 'long' });

  return `${prefix}، ${date.toLocaleDateString('ar-SY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;
}

function getStatusTone(
  status: string,
): 'neutral' | 'primary' | 'success' | 'warning' | 'error' {
  if (status === 'Cancelled') {
    return 'error';
  }

  if (status === 'Delivered') {
    return 'success';
  }

  if (status === 'Ready') {
    return 'warning';
  }

  return status === 'New' ? 'primary' : 'neutral';
}

export function IncomingOrdersScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [search, setSearch] = useState('');
  const [cancellationFilter, setCancellationFilter] =
    useState<CancellationFilter>('all');
  const [deliveryDateFilter, setDeliveryDateFilter] = useState('');
  const [showDateFilterPicker, setShowDateFilterPicker] = useState(false);
  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [shopIdFilter, setShopIdFilter] = useState('');
  const [exporting, setExporting] = useState(false);
  const isFactoryView =
    user?.role === UserRole.ADMIN || user?.role === UserRole.FACTORY_MANAGER;

  const loadOrders = useCallback(async () => {
    const response = await api.get<OrderRow[]>('/orders', {
      params: {
        search: search.trim() || undefined,
        date: deliveryDateFilter || undefined,
        status: cancellationFilter === 'cancelled' ? 'Cancelled' : undefined,
        shopId: isFactoryView && shopIdFilter ? shopIdFilter : undefined,
      },
    });

    const loadedOrders =
      cancellationFilter === 'active'
        ? response.data.filter((order) => order.status !== 'Cancelled')
        : response.data;

    setOrders(loadedOrders);
  }, [cancellationFilter, deliveryDateFilter, isFactoryView, search, shopIdFilter]);

  useEffect(() => {
    if (!isFactoryView) {
      setShops([]);
      setShopIdFilter('');
      return;
    }

    async function loadShops() {
      try {
        const response = await api.get<ShopSummary[]>('/shops', {
          params: { type: ShopType.BRANCH },
        });

        setShops(response.data ?? []);
      } catch (error) {
        Alert.alert('خطأ', getApiErrorMessage(error, 'تعذر تحميل المحلات.'));
      }
    }

    void loadShops();
  }, [isFactoryView]);

  const sections = [...orders]
    .sort(
      (first, second) => {
        if (isFactoryView) {
          const branchComparison = (first.shop?.name ?? '').localeCompare(
            second.shop?.name ?? '',
            'ar',
          );

          if (branchComparison !== 0) {
            return branchComparison;
          }
        }

        return (
          new Date(first.deliveryDatetime).getTime() -
          new Date(second.deliveryDatetime).getTime()
        );
      },
    )
    .reduce<OrderSection[]>((result, order) => {
      const dateKey = getLocalDateKey(order.deliveryDatetime);
      const branchKey = isFactoryView ? order.shop?.id ?? 'unassigned' : 'current';
      const branchName = order.shop?.name ?? 'فرع غير محدد';
      const existingSection = result[result.length - 1];

      if (
        existingSection?.dateKey === dateKey &&
        existingSection.branchKey === branchKey
      ) {
        existingSection.data.push(order);
      } else {
        result.push({
          dateKey,
          branchKey,
          branchName,
          showBranchHeader:
            isFactoryView && existingSection?.branchKey !== branchKey,
          title: formatDayTitle(dateKey),
          data: [order],
        });
      }

      return result;
    }, []);

  useFocusEffect(useCallback(() => {
    void loadOrders();
  }, [loadOrders]));

  const exportOrders = async () => {
    try {
      setExporting(true);
      const branchGroups = new Map<string, OrderRow[]>();
      orders.forEach((order) => {
        const branchName = order.shop?.name ?? 'فرع غير محدد';
        branchGroups.set(branchName, [
          ...(branchGroups.get(branchName) ?? []),
          order,
        ]);
      });

      await printReport({
        title: 'تفاصيل طلبيات الإنتاج حسب الفروع',
        subtitle: 'تفاصيل التجهيز المطلوبة للمعمل',
        fileName: 'orders-by-branch.pdf',
        sections: [...branchGroups.entries()].map(([branchName, branchOrders]) => ({
          title: branchName,
          items: branchOrders.map((order) => ({
            title: `طلب ${order.orderNumber} — ${order.customerName}`,
            lines: [
              `موعد التسليم: ${new Date(order.deliveryDatetime).toLocaleString('ar-SY')}`,
              `مكان التسليم: ${order.moldDeliveryShop?.name ?? order.shop?.name ?? 'غير محدد'}`,
              `الأولوية: ${order.isUrgent ? 'عاجل' : 'عادي'}`,
              order.notes ? `ملاحظات الطلب: ${order.notes}` : '',
              ...(order.items ?? []).flatMap((item, itemIndex) => {
                const display = buildOrderItemDisplay(item);
                return [
                  `المنتج ${itemIndex + 1}: ${display.text}`,
                  item.referenceImages?.length
                    ? `الصور المرجعية: ${item.referenceImages.length}`
                    : '',
                ];
              }),
            ],
            images: (order.items ?? []).flatMap((item, itemIndex) =>
              (item.referenceImages ?? []).map((url, imageIndex) => ({
                url,
                caption: `صورة المنتج ${itemIndex + 1} — صورة ${imageIndex + 1}`,
              })),
            ),
          })),
        })),
      });
    } catch {
      Alert.alert('خطأ', 'تعذر فتح ملف طباعة الطلبيات.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.heading}>الطلبات الواردة</Text>
          <TouchableOpacity
            style={[styles.exportButton, exporting ? styles.buttonDisabled : null]}
            onPress={() => void exportOrders()}
            disabled={exporting}
          >
            <MaterialIcons name="picture-as-pdf" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.exportButtonText}>
              {exporting ? 'جاري التحضير...' : 'طباعة / حفظ الطلبيات PDF'}
            </Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.search}
          placeholder="بحث عن طلب أو عميل"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => void loadOrders()}
        />
        <View style={styles.filterPanel}>
          <View style={styles.filterTitleRow}>
            <MaterialIcons
              name="filter-list"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.filterTitle}>فلترة الطلبات</Text>
          </View>
          <View style={styles.filterChips}>
            {cancellationFilterOptions.map((option) => {
              const active = cancellationFilter === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.filterChip, active ? styles.filterChipActive : null]}
                  onPress={() => setCancellationFilter(option.value)}
                >
                  <MaterialIcons
                    name={option.icon}
                    size={18}
                    color={
                      active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant
                    }
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      active ? styles.filterChipTextActive : null,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.dateFilterRow}>
            <TouchableOpacity
              style={styles.dateFilterButton}
              onPress={() => setShowDateFilterPicker(true)}
            >
              <MaterialIcons name="event" size={20} color={theme.colors.primary} />
              <Text style={styles.dateFilterText}>
                {deliveryDateFilter
                  ? formatDeliveryDate(deliveryDateFilter)
                  : 'كل تواريخ التواصي'}
              </Text>
            </TouchableOpacity>
            {deliveryDateFilter ? (
              <TouchableOpacity
                accessibilityLabel="مسح فلتر التاريخ"
                style={styles.clearDateButton}
                onPress={() => setDeliveryDateFilter('')}
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            ) : null}
          </View>
          {isFactoryView ? (
            <View style={styles.shopFilterGroup}>
              <Text style={styles.filterSubtitle}>فلترة حسب المحل</Text>
              <View style={styles.filterChips}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    !shopIdFilter ? styles.filterChipActive : null,
                  ]}
                  onPress={() => setShopIdFilter('')}
                >
                  <MaterialIcons
                    name="storefront"
                    size={18}
                    color={
                      !shopIdFilter
                        ? theme.colors.onPrimary
                        : theme.colors.onSurfaceVariant
                    }
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      !shopIdFilter ? styles.filterChipTextActive : null,
                    ]}
                  >
                    كل المحلات
                  </Text>
                </TouchableOpacity>
                {shops.map((shop) => {
                  const active = shopIdFilter === shop.id;

                  return (
                    <TouchableOpacity
                      key={shop.id}
                      style={[styles.filterChip, active ? styles.filterChipActive : null]}
                      onPress={() => setShopIdFilter(shop.id)}
                    >
                      <MaterialIcons
                        name="store"
                        size={18}
                        color={
                          active
                            ? theme.colors.onPrimary
                            : theme.colors.onSurfaceVariant
                        }
                      />
                      <Text
                        style={[
                          styles.filterChipText,
                          active ? styles.filterChipTextActive : null,
                        ]}
                      >
                        {shop.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={<Text style={styles.emptyText}>لا توجد طلبات لعرضها.</Text>}
        renderSectionHeader={({ section }) => (
          <>
            {section.showBranchHeader ? (
              <View style={styles.branchHeader}>
                <Text style={styles.branchTitle}>{section.branchName}</Text>
              </View>
            ) : null}
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>{section.title}</Text>
              <Text style={styles.dayCount}>{section.data.length} طلب</Text>
            </View>
          </>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.orderNumber}>{item.orderNumber}</Text>
              <View style={styles.badgeRow}>
                <StatusBadge
                  label={orderStatusLabel(item.status)}
                  tone={getStatusTone(item.status)}
                />
                <StatusBadge
                  label={item.isUrgent ? 'عاجل' : 'عادي'}
                  tone={item.isUrgent ? 'error' : 'neutral'}
                />
              </View>
            </View>
            <Text style={styles.customer}>{item.customerName}</Text>
            {item.items?.map((orderItem, itemIndex) => {
              const display = buildOrderItemDisplay(orderItem);

              return (
                <Text key={orderItem.id} style={styles.itemSummaryText}>
                  {`${itemIndex + 1}. ${display.text}`}
                </Text>
              );
            })}
            <Text style={styles.meta}>
              وقت التسليم: {new Date(item.deliveryDatetime).toLocaleTimeString('ar-SY', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <Text style={styles.meta}>مكان التسليم: {item.moldDeliveryShop?.name ?? 'غير محدد'}</Text>
          </TouchableOpacity>
        )}
      />
      <DeliveryDatePicker
        visible={showDateFilterPicker}
        value={deliveryDateFilter || getLocalDateKey(new Date().toISOString())}
        onClose={() => setShowDateFilterPicker(false)}
        onConfirm={(value) => {
          setDeliveryDateFilter(value);
          setShowDateFilterPicker(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: theme.colors.surface },
  header: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },
  heading: {
    ...theme.typography.heading,
    color: theme.colors.onSurface,
    textAlign: 'right',
  },
  headerRow: {
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
  buttonDisabled: {
    opacity: 0.6,
  },
  search: {
    height: 48,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surfaceContainerLowest,
    paddingHorizontal: theme.spacing.md,
    textAlign: 'right',
    ...theme.typography.body,
  },
  filterPanel: {
    gap: theme.spacing.sm,
  },
  filterTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  filterTitle: {
    ...theme.typography.title,
    color: theme.colors.onSurface,
    textAlign: 'right',
  },
  filterSubtitle: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
  },
  filterChips: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  filterChip: {
    minHeight: 42,
    minWidth: 104,
    flexGrow: 1,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surfaceContainerLowest,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  filterChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
  },
  filterChipTextActive: {
    color: theme.colors.onPrimary,
    fontFamily: 'Cairo_700Bold',
  },
  dateFilterRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  dateFilterButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surfaceContainerLowest,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  dateFilterText: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.onSurface,
    textAlign: 'right',
  },
  clearDateButton: {
    width: 46,
    height: 46,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopFilterGroup: {
    gap: theme.spacing.xs,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },
  dayHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
  },
  branchHeader: {
    borderRightWidth: 4,
    borderRightColor: theme.colors.primary,
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  branchTitle: {
    ...theme.typography.heading,
    color: theme.colors.primary,
    textAlign: 'right',
  },
  dayTitle: {
    ...theme.typography.title,
    color: theme.colors.onSurface,
    textAlign: 'right',
  },
  dayCount: {
    ...theme.typography.label,
    color: theme.colors.primary,
  },
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  rowBetween: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  orderNumber: {
    ...theme.typography.title,
    color: theme.colors.primary,
  },
  customer: {
    ...theme.typography.title,
    color: theme.colors.onSurface,
    textAlign: 'right',
  },
  meta: {
    ...theme.typography.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
  },
  itemSummaryText: {
    ...theme.typography.body,
    color: theme.colors.onSurface,
    textAlign: 'right',
    lineHeight: 26,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: theme.spacing.xxl,
  },
});
