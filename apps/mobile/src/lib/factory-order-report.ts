import { buildOrderItemDisplay } from './order-item-details';
import type { ReportGroup, ReportItem, ReportSection } from './print-report';

export interface FactoryReportOrderItem {
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
  moldBaseType?: string | null;
  foamCount?: number | null;
  cakeLayerCount?: number | null;
  finishType?: string | null;
  specialDetails?: string | null;
  writingText?: string | null;
  peopleCount?: number;
  referenceImages?: string[];
}

export interface FactoryReportOrder {
  orderNumber: string;
  customerName: string;
  deliveryDatetime: string;
  isUrgent: boolean;
  notes?: string | null;
  items?: FactoryReportOrderItem[];
  shop?: {
    name: string;
  } | null;
  moldDeliveryShop?: {
    name: string;
  } | null;
}

export interface FactoryOrderReport {
  milkMoldCount: number;
  chocolateMoldCount: number;
  mixedMoldCount: number;
  summaryLines: string[];
  sections: ReportSection[];
}

type GroupKey = 'milk' | 'chocolate' | 'mixed' | 'pieces';

const groupDefinitions: Array<{ key: GroupKey; title: string }> = [
  { key: 'milk', title: 'قلب حليب' },
  { key: 'chocolate', title: 'قلب شوكولا' },
  { key: 'mixed', title: 'قلب مشكل' },
  { key: 'pieces', title: 'قطع' },
];

function getGroupKey(item: FactoryReportOrderItem): GroupKey {
  if (item.itemKind !== 'Mold') {
    return 'pieces';
  }

  if (item.moldInnerColor === 'White') {
    return 'milk';
  }

  if (item.moldInnerColor === 'Black') {
    return 'chocolate';
  }

  return 'mixed';
}

function buildReportItem(
  order: FactoryReportOrder,
  item: FactoryReportOrderItem,
  itemIndex: number,
): ReportItem {
  const display = buildOrderItemDisplay(item);

  return {
    title: `طلب ${order.orderNumber} — ${order.customerName} — المنتج ${itemIndex + 1}`,
    lines: [
      `موعد التسليم: ${new Date(order.deliveryDatetime).toLocaleString('ar-SY')}`,
      `مكان التسليم: ${order.moldDeliveryShop?.name ?? order.shop?.name ?? 'غير محدد'}`,
      `الأولوية: ${order.isUrgent ? 'عاجل' : 'عادي'}`,
      order.notes ? `ملاحظات الطلب: ${order.notes}` : '',
      display.text,
      item.referenceImages?.length
        ? `الصور المرجعية: ${item.referenceImages.length}`
        : '',
    ],
    images: (item.referenceImages ?? []).map((url, imageIndex) => ({
      url,
      caption: `طلب ${order.orderNumber} — المنتج ${itemIndex + 1} — صورة ${imageIndex + 1}`,
    })),
  };
}

export function buildFactoryOrderReport(
  orders: FactoryReportOrder[],
): FactoryOrderReport {
  const branchGroups = new Map<string, Record<GroupKey, ReportItem[]>>();
  let milkMoldCount = 0;
  let chocolateMoldCount = 0;
  let mixedMoldCount = 0;

  orders.forEach((order) => {
    const branchName = order.shop?.name ?? 'فرع غير محدد';
    const groups = branchGroups.get(branchName) ?? {
      milk: [],
      chocolate: [],
      mixed: [],
      pieces: [],
    };

    (order.items ?? []).forEach((item, itemIndex) => {
      const groupKey = getGroupKey(item);
      groups[groupKey].push(buildReportItem(order, item, itemIndex));

      if (groupKey === 'milk') {
        milkMoldCount += 1;
      } else if (groupKey === 'chocolate') {
        chocolateMoldCount += 1;
      } else if (item.itemKind === 'Mold') {
        mixedMoldCount += 1;
      }
    });

    branchGroups.set(branchName, groups);
  });

  const sections = [...branchGroups.entries()]
    .sort(([firstBranch], [secondBranch]) =>
      firstBranch.localeCompare(secondBranch, 'ar'),
    )
    .map(([branchName, groups]): ReportSection => ({
      title: branchName,
      groups: groupDefinitions.map(
        ({ key, title }): ReportGroup => ({
          title: `${title} (${groups[key].length})`,
          items: groups[key],
        }),
      ),
    }));

  return {
    milkMoldCount,
    chocolateMoldCount,
    mixedMoldCount,
    summaryLines: [
      `مجمل عدد القوالب التي لونها من الداخل حليب: ${milkMoldCount}`,
      `مجمل عدد القوالب التي لونها من الداخل شوكولا: ${chocolateMoldCount}`,
    ],
    sections,
  };
}
