import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { UserRole } from '@sugarprecision/shared-types';
import type { ShopSummary } from '@sugarprecision/shared-types';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../context/auth-context';
import theme from '../theme';
import api from '../lib/api';
import { getApiErrorMessage } from '../lib/api-error';
import { printReport } from '../lib/print-report';
import {
  buildFactoryOrderReport,
  type FactoryOrderReport,
} from '../lib/factory-order-report';
import { ReportImageExporter } from '../lib/report-image-exporter';
import { StatusBadge } from '../components/status-badge';
import {
  DeliveryDatePicker,
  formatDeliveryDate,
} from '../components/delivery-date-time-picker';
import { orderStatusLabel } from '../lib/labels';
import { buildOrderItemDisplay } from '../lib/order-item-details';
import {
  getCachedDeliveryTotals,
  getCachedOrders,
  getCachedShops,
  getLastSuccessfulSync,
  type DeliveryTotals,
  type IncomingOrder,
  upsertCachedOrder,
} from '../storage/orders-cache';
import {
  getDeliveryTotalsDateRange,
  requestIncomingOrdersSync,
  subscribeToIncomingOrdersSyncRequests,
  syncIncomingOrders,
  type IncomingOrdersSyncResult,
} from '../services/orders-sync.service';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];
type CancellationFilter = 'all' | 'active' | 'cancelled';

interface OrderSection {
  title: string;
  dateKey: string;
  branchKey: string;
  branchName: string;
  showBranchHeader: boolean;
  data: IncomingOrder[];
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

function formatMoney(value: number) {
  return `${Math.round(value)} ر.س`;
}

export function filterIncomingOrders(
  orders: IncomingOrder[],
  filters: {
    search: string;
    cancellation: CancellationFilter;
    deliveryDate: string;
    shopId: string;
    isFactoryView: boolean;
  },
) {
  const normalizedSearch = filters.search.trim().toLocaleLowerCase();

  return orders.filter((order) => {
    if (
      filters.cancellation === 'active' &&
      order.status === 'Cancelled'
    ) {
      return false;
    }
    if (
      filters.cancellation === 'cancelled' &&
      order.status !== 'Cancelled'
    ) {
      return false;
    }
    if (
      filters.deliveryDate &&
      getLocalDateKey(order.deliveryDatetime) !== filters.deliveryDate
    ) {
      return false;
    }
    if (
      filters.isFactoryView &&
      filters.shopId &&
      order.shop?.id !== filters.shopId
    ) {
      return false;
    }
    if (!normalizedSearch) {
      return true;
    }

    return [order.orderNumber, order.customerName, order.customerPhone ?? '']
      .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
  });
}

export function deriveDeliveryTotals(
  orders: IncomingOrder[],
  dateKey: string,
  shopId: string,
  isFactoryView: boolean,
): DeliveryTotals {
  const { start, end } = getDeliveryTotalsDateRange(dateKey);
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const todayKey = getLocalDateKey(new Date().toISOString());
  const todayEndTime = new Date(
    getDeliveryTotalsDateRange(todayKey).end,
  ).getTime();
  const undeliveredEndTime = Math.min(endTime, todayEndTime);

  return orders.reduce<DeliveryTotals>(
    (totals, order) => {
      if (isFactoryView && shopId && order.shop?.id !== shopId) {
        return totals;
      }

      const deliveredAtTime = order.deliveredAt
        ? new Date(order.deliveredAt).getTime()
        : Number.NaN;
      if (
        order.status === 'Delivered' &&
        deliveredAtTime >= startTime &&
        deliveredAtTime < endTime
      ) {
        totals.deliveredCount += 1;
        totals.deliveredTotal += order.totalPrice;
      }

      const deliveryTime = new Date(order.deliveryDatetime).getTime();
      if (
        order.status !== 'Delivered' &&
        order.status !== 'Cancelled' &&
        deliveryTime < undeliveredEndTime
      ) {
        totals.undeliveredCount += 1;
        totals.undeliveredTotal += order.totalPrice;
      }

      return totals;
    },
    {
      deliveredTotal: 0,
      deliveredCount: 0,
      undeliveredTotal: 0,
      undeliveredCount: 0,
    },
  );
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
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [orders, setOrders] = useState<IncomingOrder[] | null>(null);
  const [search, setSearch] = useState('');
  const [cancellationFilter, setCancellationFilter] =
    useState<CancellationFilter>('all');
  const [deliveryDateFilter, setDeliveryDateFilter] = useState('');
  const [showDateFilterPicker, setShowDateFilterPicker] = useState(false);
  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [shopIdFilter, setShopIdFilter] = useState('');
  const [exporting, setExporting] = useState(false);
  const [imageExportReport, setImageExportReport] =
    useState<FactoryOrderReport | null>(null);
  const [cachedTotals, setCachedTotals] = useState<{
    scopeKey: string;
    value: DeliveryTotals;
  } | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [lastSuccessfulSync, setLastSuccessfulSyncState] = useState<
    string | null
  >(null);
  const [confirmingDeliveryId, setConfirmingDeliveryId] = useState<
    string | null
  >(null);
  const isFactoryView =
    user?.role === UserRole.ADMIN || user?.role === UserRole.FACTORY_MANAGER;
  const totalsDateKey =
    deliveryDateFilter || getLocalDateKey(new Date().toISOString());
  const totalsScopeKey = `${totalsDateKey}:${isFactoryView ? shopIdFilter || 'all' : 'current'}`;
  const allOrders = orders ?? [];

  const visibleOrders = useMemo(
    () =>
      filterIncomingOrders(allOrders, {
        search,
        cancellation: cancellationFilter,
        deliveryDate: deliveryDateFilter,
        shopId: shopIdFilter,
        isFactoryView,
      }),
    [
      allOrders,
      cancellationFilter,
      deliveryDateFilter,
      isFactoryView,
      search,
      shopIdFilter,
    ],
  );

  const derivedTotals = useMemo(
    () =>
      deriveDeliveryTotals(
        allOrders,
        totalsDateKey,
        shopIdFilter,
        isFactoryView,
      ),
    [allOrders, isFactoryView, shopIdFilter, totalsDateKey],
  );
  const deliveryTotals =
    cachedTotals?.scopeKey === totalsScopeKey
      ? cachedTotals.value
      : derivedTotals;

  const applySyncResult = useCallback(
    (result: IncomingOrdersSyncResult) => {
      if (result.orders !== undefined) {
        setOrders(result.orders);
      }
      if (result.shops !== undefined) {
        setShops(result.shops);
      }
      if (result.deliveryTotals !== undefined) {
        setCachedTotals({
          scopeKey: totalsScopeKey,
          value: result.deliveryTotals,
        });
      } else if (result.orders !== undefined) {
        setCachedTotals(null);
      }
      if (result.lastSuccessfulSync) {
        setLastSuccessfulSyncState(result.lastSuccessfulSync);
      }

      const failedResources = Object.keys(result.errors);
      setSyncWarning(
        failedResources.length > 0
          ? 'تعذر تحديث بعض البيانات. يتم عرض آخر بيانات محفوظة.'
          : null,
      );
    },
    [totalsScopeKey],
  );

  const runSynchronization = useCallback(
    async (manual = false) => {
      if (!user) {
        return;
      }

      if (manual) {
        setRefreshing(true);
      }

      try {
        const result = await syncIncomingOrders({
          userId: user.id,
          isFactoryView,
          totalsDateKey,
          shopId: isFactoryView && shopIdFilter ? shopIdFilter : undefined,
        });
        applySyncResult(result);
      } catch (error) {
        console.warn('Failed to synchronize incoming orders', error);
        setSyncWarning('تعذر التحديث. يتم عرض آخر بيانات محفوظة.');
      } finally {
        if (manual) {
          setRefreshing(false);
        }
      }
    },
    [
      applySyncResult,
      isFactoryView,
      shopIdFilter,
      totalsDateKey,
      user,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!user) {
        setOrders([]);
        setInitialLoading(false);
        return;
      }

      setInitialLoading(true);
      setOrders(null);
      setSyncWarning(null);
      setSearch('');
      setCancellationFilter('all');
      setDeliveryDateFilter('');
      setShopIdFilter('');

      const initialDateKey = getLocalDateKey(new Date().toISOString());
      const [storedOrders, storedShops, storedTotals, storedSyncTime] =
        await Promise.all([
          getCachedOrders(user.id).catch((error) => {
            console.warn('Failed to load cached orders', error);
            return null;
          }),
          isFactoryView
            ? getCachedShops(user.id).catch((error) => {
                console.warn('Failed to load cached shops', error);
                return null;
              })
            : Promise.resolve(null),
          getCachedDeliveryTotals(user.id, initialDateKey).catch((error) => {
            console.warn('Failed to load cached delivery totals', error);
            return null;
          }),
          getLastSuccessfulSync(user.id).catch((error) => {
            console.warn('Failed to load last synchronization time', error);
            return null;
          }),
        ]);

      if (cancelled) {
        return;
      }

      if (storedShops !== null) {
        setShops(storedShops);
      } else if (!isFactoryView) {
        setShops([]);
      }
      if (storedTotals !== null) {
        setCachedTotals({
          scopeKey: `${initialDateKey}:${isFactoryView ? 'all' : 'current'}`,
          value: storedTotals,
        });
      } else {
        setCachedTotals(null);
      }
      setLastSuccessfulSyncState(storedSyncTime);

      if (storedOrders !== null) {
        setOrders(storedOrders);
        setInitialLoading(false);
        return;
      }

      const result = await syncIncomingOrders({
        userId: user.id,
        isFactoryView,
        totalsDateKey: initialDateKey,
      });
      if (cancelled) {
        return;
      }

      setOrders(result.orders ?? []);
      if (result.shops !== undefined) {
        setShops(result.shops);
      }
      if (result.deliveryTotals !== undefined) {
        setCachedTotals({
          scopeKey: `${initialDateKey}:${isFactoryView ? 'all' : 'current'}`,
          value: result.deliveryTotals,
        });
      }
      if (result.lastSuccessfulSync) {
        setLastSuccessfulSyncState(result.lastSuccessfulSync);
      }
      if (Object.keys(result.errors).length > 0) {
        setSyncWarning('تعذر تحديث بعض البيانات. يتم عرض البيانات المتاحة.');
      }
      setInitialLoading(false);
    }

    void hydrate().catch((error) => {
      if (!cancelled) {
        console.warn('Failed to initialize incoming orders', error);
        setOrders([]);
        setInitialLoading(false);
        setSyncWarning('تعذر تحميل البيانات المحفوظة أو الاتصال بالخادم.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isFactoryView, user?.id]);

  useEffect(() => {
    if (!user || orders === null) {
      return;
    }

    let cancelled = false;
    setCachedTotals(null);
    void getCachedDeliveryTotals(
      user.id,
      totalsDateKey,
      isFactoryView && shopIdFilter ? shopIdFilter : undefined,
    )
      .then((value) => {
        if (!cancelled && value !== null) {
          setCachedTotals({ scopeKey: totalsScopeKey, value });
        }
      })
      .catch((error) => {
        console.warn('Failed to load cached delivery totals', error);
      });

    return () => {
      cancelled = true;
    };
  }, [isFactoryView, shopIdFilter, totalsDateKey, totalsScopeKey, user?.id]);

  useEffect(
    () =>
      subscribeToIncomingOrdersSyncRequests(() => {
        void runSynchronization();
      }),
    [runSynchronization],
  );

  const sections = [...visibleOrders]
    .sort((first, second) => {
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
    })
    .reduce<OrderSection[]>((result, order) => {
      const dateKey = getLocalDateKey(order.deliveryDatetime);
      const branchKey = isFactoryView
        ? (order.shop?.id ?? 'unassigned')
        : 'current';
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

  const confirmDelivery = async (orderId: string) => {
    try {
      setConfirmingDeliveryId(orderId);
      const response = await api.post<IncomingOrder>(
        `/orders/${orderId}/confirm-delivery`,
      );
      setOrders((current) => {
        if (!current) {
          return [response.data];
        }
        return current.map((order) =>
          order.id === response.data.id ? response.data : order,
        );
      });
      setCachedTotals(null);
      if (user) {
        void upsertCachedOrder(user.id, response.data).catch((error) => {
          console.warn('Failed to cache confirmed delivery', error);
        });
      }
      requestIncomingOrdersSync();
    } catch (error) {
      Alert.alert(
        'خطأ',
        getApiErrorMessage(error, 'تعذر تأكيد تسليم التوصاية. حاول مرة أخرى.'),
      );
    } finally {
      setConfirmingDeliveryId(null);
    }
  };

  const exportOrders = async () => {
    try {
      setExporting(true);
      const report = buildFactoryOrderReport(visibleOrders);

      await printReport({
        title: 'تواصي الإنتاج حسب الفروع',
        subtitle: 'تفاصيل التواصي والصور حسب رقم التوصاية',
        fileName: 'orders-by-branch.pdf',
        summaryLines: report.summaryLines,
        sections: report.sections,
      });
    } catch {
      Alert.alert('خطأ', 'تعذر فتح ملف طباعة الطلبيات.');
    } finally {
      setExporting(false);
    }
  };

  const exportOrderImages = () => {
    const report = buildFactoryOrderReport(visibleOrders);
    const hasPages = report.sections.some((section) => section.items?.length);

    if (!hasPages) {
      Alert.alert('لا توجد بيانات', 'لا توجد تواصي لتصديرها كصور.');
      return;
    }

    setImageExportReport(report);
  };

  const listHeader = (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>الطلبات الواردة</Text>
        <View style={styles.exportActions}>
          <TouchableOpacity
            style={[
              styles.exportButton,
              exporting ? styles.buttonDisabled : null,
            ]}
            onPress={() => void exportOrders()}
            disabled={exporting || Boolean(imageExportReport)}
          >
            <MaterialIcons
              name="picture-as-pdf"
              size={20}
              color={theme.colors.onPrimary}
            />
            <Text style={styles.exportButtonText}>
              {exporting ? 'جاري التحضير...' : 'طباعة PDF'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.exportButton,
              imageExportReport ? styles.buttonDisabled : null,
            ]}
            onPress={exportOrderImages}
            disabled={exporting || Boolean(imageExportReport)}
          >
            <MaterialIcons
              name="image"
              size={20}
              color={theme.colors.onPrimary}
            />
            <Text style={styles.exportButtonText}>
              {imageExportReport ? 'جاري حفظ الصور...' : 'تصدير صور'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {syncWarning ? (
        <View style={styles.syncBanner}>
          <MaterialIcons
            name="cloud-off"
            size={18}
            color={theme.colors.warning}
          />
          <View style={styles.syncBannerTextGroup}>
            <Text style={styles.syncBannerText}>{syncWarning}</Text>
            {lastSuccessfulSync ? (
              <Text style={styles.syncTimestamp}>
                آخر تحديث ناجح:{' '}
                {new Date(lastSuccessfulSync).toLocaleString('ar-SY')}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
      <View style={styles.totalsGrid}>
        <View style={[styles.totalCard, styles.deliveredTotalCard]}>
          <View style={styles.totalTitleRow}>
            <MaterialIcons
              name="check-circle"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.totalTitle}>القوالب التي تسلمت</Text>
          </View>
          <Text style={styles.totalValue}>
            {formatMoney(deliveryTotals.deliveredTotal)}
          </Text>
          <Text style={styles.totalSubtitle}>
            {deliveryTotals.deliveredCount} توصاية -{' '}
            {formatDeliveryDate(totalsDateKey)}
          </Text>
        </View>
        <View style={[styles.totalCard, styles.undeliveredTotalCard]}>
          <View style={styles.totalTitleRow}>
            <MaterialIcons
              name="schedule"
              size={20}
              color={theme.colors.warning}
            />
            <Text style={styles.totalTitle}>القوالب التي لم تسلم</Text>
          </View>
          <Text style={styles.totalValue}>
            {formatMoney(deliveryTotals.undeliveredTotal)}
          </Text>
          <Text style={styles.totalSubtitle}>
            {deliveryTotals.undeliveredCount} توصاية - حتى نهاية اليوم
          </Text>
        </View>
      </View>
      <TextInput
        style={styles.search}
        placeholder="بحث عن طلب أو عميل"
        value={search}
        onChangeText={setSearch}
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
                style={[
                  styles.filterChip,
                  active ? styles.filterChipActive : null,
                ]}
                onPress={() => setCancellationFilter(option.value)}
              >
                <MaterialIcons
                  name={option.icon}
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
            <MaterialIcons
              name="event"
              size={20}
              color={theme.colors.primary}
            />
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
                    style={[
                      styles.filterChip,
                      active ? styles.filterChipActive : null,
                    ]}
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
  );

  if (initialLoading && orders === null) {
    return (
      <View style={styles.initialLoader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>جاري تحميل الطلبات...</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={listHeader}
        stickySectionHeadersEnabled={false}
        refreshing={refreshing}
        onRefresh={() => void runSynchronization(true)}
        ListEmptyComponent={
          <Text style={styles.emptyText}>لا توجد طلبات لعرضها.</Text>
        }
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
        renderItem={({ item }) => {
          const isDelivered = item.status === 'Delivered';
          const isCancelled = item.status === 'Cancelled';
          const canConfirmDelivery = !isDelivered && !isCancelled;
          const isConfirmingDelivery = confirmingDeliveryId === item.id;

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate('OrderDetails', { orderId: item.id })
              }
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
                وقت التسليم:{' '}
                {new Date(item.deliveryDatetime).toLocaleTimeString('ar-SY', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Text style={styles.meta}>
                مكان التسليم: {item.moldDeliveryShop?.name ?? 'غير محدد'}
              </Text>
              {isDelivered ? (
                <View style={styles.deliveredIndicator}>
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.deliveredIndicatorText}>
                    تم التسليم
                    {item.deliveredAt
                      ? ` - ${new Date(item.deliveredAt).toLocaleString('ar-SY')}`
                      : ''}
                  </Text>
                </View>
              ) : null}
              {canConfirmDelivery ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[
                    styles.confirmDeliveryButton,
                    isConfirmingDelivery ? styles.buttonDisabled : null,
                  ]}
                  disabled={isConfirmingDelivery}
                  onPress={(event) => {
                    event.stopPropagation();
                    void confirmDelivery(item.id);
                  }}
                >
                  <MaterialIcons
                    name="done"
                    size={20}
                    color={theme.colors.onPrimary}
                  />
                  <Text style={styles.confirmDeliveryButtonText}>
                    {isConfirmingDelivery
                      ? 'جاري تأكيد التسليم...'
                      : 'تأكيد التسليم'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          );
        }}
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
      {imageExportReport ? (
        <ReportImageExporter
          title="تواصي الإنتاج حسب الفروع"
          subtitle="تفاصيل التواصي والصور حسب رقم التوصاية"
          fileNamePrefix="orders-by-branch"
          sections={imageExportReport.sections}
          onDone={() => {
            setImageExportReport(null);
            Alert.alert('تم الحفظ', 'تم حفظ صور التواصي في معرض الصور.');
          }}
          onError={() => {
            setImageExportReport(null);
            Alert.alert('خطأ', 'تعذر حفظ التواصي كصور.');
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: theme.colors.surface },
  initialLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.onSurfaceVariant,
  },
  header: {
    paddingVertical: theme.spacing.lg,
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
  syncBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  syncBannerTextGroup: {
    flex: 1,
    gap: 2,
  },
  syncBannerText: {
    ...theme.typography.label,
    color: theme.colors.onSurface,
    textAlign: 'right',
  },
  syncTimestamp: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
  },
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  exportActions: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  totalsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  totalCard: {
    flexGrow: 1,
    flexBasis: 220,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surfaceContainerLowest,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  deliveredTotalCard: {
    borderRightWidth: 4,
    borderRightColor: theme.colors.primary,
  },
  undeliveredTotalCard: {
    borderRightWidth: 4,
    borderRightColor: theme.colors.warning,
  },
  totalTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  totalTitle: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
  },
  totalValue: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 18,
    lineHeight: 26,
    color: theme.colors.onSurface,
    textAlign: 'right',
  },
  totalSubtitle: {
    ...theme.typography.label,
    color: theme.colors.primary,
    textAlign: 'right',
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
    gap: theme.spacing.xs,
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
    gap: theme.spacing.xs,
  },
  filterChip: {
    minHeight: 36,
    minWidth: 88,
    flexGrow: 1,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surfaceContainerLowest,
    paddingHorizontal: theme.spacing.sm,
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
    gap: theme.spacing.xs,
  },
  dateFilterButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surfaceContainerLowest,
    paddingHorizontal: theme.spacing.sm,
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
    width: 40,
    height: 40,
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
  deliveredIndicator: {
    minHeight: 42,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  deliveredIndicatorText: {
    ...theme.typography.label,
    color: theme.colors.primary,
    textAlign: 'right',
  },
  confirmDeliveryButton: {
    minHeight: 44,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  confirmDeliveryButtonText: {
    ...theme.typography.label,
    color: theme.colors.onPrimary,
    fontFamily: 'Cairo_700Bold',
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
