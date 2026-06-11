import React, { useCallback, useState } from 'react';
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
import { UserRole } from '@sugarprecision/shared-types';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../context/auth-context';
import theme from '../theme';
import api from '../lib/api';
import { printReport } from '../lib/print-report';
import { StatusBadge } from '../components/status-badge';
import {
  cakeFinishLabel,
  cakeShapeLabel,
  cakeTypeLabel,
  moldConfigurationLabel,
  moldFlavorLabel,
  moldInnerColorLabel,
  orderItemKindLabel,
} from '../lib/labels';

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
  moldColor?: string | null;
  hasFillings?: boolean;
  filling?: string | null;
  withFoam?: boolean;
  finishType?: string | null;
  specialDetails?: string | null;
  peopleCount?: number;
  referenceImages?: string[];
}

interface OrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  deliveryDatetime: string;
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

export function IncomingOrdersScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const isFactoryView =
    user?.role === UserRole.ADMIN || user?.role === UserRole.FACTORY_MANAGER;

  const loadOrders = useCallback(async () => {
    const response = await api.get('/orders', {
      params: {
        search: search || undefined,
      },
    });
    setOrders(response.data);
  }, [search]);

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
            title: 'طلب إنتاج',
            lines: [
              `موعد التسليم: ${new Date(order.deliveryDatetime).toLocaleString('ar-SY')}`,
              `مكان التسليم: ${order.moldDeliveryShop?.name ?? order.shop?.name ?? 'غير محدد'}`,
              `الأولوية: ${order.isUrgent ? 'عاجل' : 'عادي'}`,
              order.notes ? `ملاحظات الطلب: ${order.notes}` : '',
              ...(order.items ?? []).flatMap((item, itemIndex) => {
                const itemHeading =
                  `المنتج ${itemIndex + 1}: ${orderItemKindLabel(item.itemKind)}`;

                if (item.itemKind === 'Pieces') {
                  return [
                    itemHeading,
                    `نوع القطع: ${item.pieceType?.trim() || '-'}`,
                    `نوع الكيك: ${cakeTypeLabel(item.cakeType)}`,
                    `عدد الطبقات: ${item.layers ?? '-'}`,
                    `زينة علوية: ${item.hasTopDecoration ? 'نعم' : 'لا'}`,
                    `عدد القطع: ${item.peopleCount ?? '-'}`,
                    item.specialDetails
                      ? `تفاصيل خاصة: ${item.specialDetails}`
                      : '',
                    item.referenceImages?.length
                      ? `الصور المرجعية: ${item.referenceImages.length}`
                      : '',
                  ];
                }

                return [
                  itemHeading,
                  `لون القالب من الداخل: ${moldInnerColorLabel(item.moldInnerColor)}`,
                  `نوع القالب: ${moldFlavorLabel(item.moldFlavor)}`,
                  `اللون الخارجي للقالب: ${item.moldColor?.trim() || '-'}`,
                  `نوع الكيك: ${cakeTypeLabel(item.cakeType)}`,
                  `الشكل: ${cakeShapeLabel(item.shape)}`,
                  `الحشوات: ${
                    item.hasFillings
                      ? item.filling?.trim() || 'نعم'
                      : 'بدون حشوات'
                  }`,
                  `الفلين: ${item.withFoam ? 'مع فلين' : 'بدون فلين'}`,
                  `عدد الطوابق: ${item.layers ?? '-'}`,
                  `التجهيز: ${cakeFinishLabel(item.finishType)}`,
                  `عدد الأشخاص: ${item.peopleCount ?? '-'}`,
                  item.specialDetails
                    ? `تفاصيل خاصة: ${item.specialDetails}`
                    : '',
                  item.referenceImages?.length
                    ? `الصور المرجعية: ${item.referenceImages.length}`
                    : '',
                ];
              }),
            ],
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
              <StatusBadge
                label={item.isUrgent ? 'عاجل' : 'عادي'}
                tone={item.isUrgent ? 'error' : 'neutral'}
              />
            </View>
            <Text style={styles.customer}>{item.customerName}</Text>
            {item.items?.some((orderItem) => orderItem.itemKind === 'Mold') ? (
              <Text style={styles.moldSummary}>
                القوالب:{' '}
                {item.items
                  .filter((orderItem) => orderItem.itemKind === 'Mold')
                  .map((orderItem) =>
                    moldConfigurationLabel(
                      orderItem.moldFlavor,
                      orderItem.moldColor,
                      orderItem.moldInnerColor,
                    ),
                  )
                  .join('، ')}
              </Text>
            ) : null}
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
  moldSummary: {
    ...theme.typography.body,
    color: theme.colors.primary,
    textAlign: 'right',
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: theme.spacing.xxl,
  },
});
