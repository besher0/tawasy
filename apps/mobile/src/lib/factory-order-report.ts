import { buildOrderItemDisplay } from './order-item-details';
import type { ReportItem, ReportSection } from './print-report';

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
  summaryLines: string[];
  sections: ReportSection[];
}

interface FactoryReportRecommendation {
  order: FactoryReportOrder;
  item: FactoryReportOrderItem | null;
}

function formatDeliveryTime(value: string) {
  return new Date(value).toLocaleTimeString('ar-SY', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Damascus',
  });
}

function getOrderBranchName(order: FactoryReportOrder) {
  return order.shop?.name ?? 'فرع غير محدد';
}

function getDeliveryBranchName(order: FactoryReportOrder) {
  return order.moldDeliveryShop?.name ?? order.shop?.name ?? 'فرع غير محدد';
}

function buildReportItem(
  recommendation: FactoryReportRecommendation,
  recommendationNumber: number,
): ReportItem {
  const { item, order } = recommendation;
  const images = item?.referenceImages ?? [];

  return {
    title: `توصاية رقم ${recommendationNumber}`,
    numbered: false,
    metaLines: [
      `ساعة التسليم: ${formatDeliveryTime(order.deliveryDatetime)}`,
      `الفرع: ${getDeliveryBranchName(order)}`,
    ],
    lines: item
      ? [
          buildOrderItemDisplay(item, {
            showEmptyProductionOptions: false,
          }).text,
        ]
      : ['لا توجد تفاصيل توصاية.'],
    images: images.map((url, imageIndex) => ({
      url,
      caption: `توصاية رقم ${recommendationNumber} - صورة ${imageIndex + 1}`,
    })),
  };
}

export function buildFactoryOrderReport(
  orders: FactoryReportOrder[],
): FactoryOrderReport {
  const branchGroups = new Map<string, FactoryReportRecommendation[]>();

  [...orders]
    .sort((first, second) => {
      const branchComparison = getOrderBranchName(first).localeCompare(
        getOrderBranchName(second),
        'ar',
      );

      if (branchComparison !== 0) {
        return branchComparison;
      }

      return (
        new Date(first.deliveryDatetime).getTime() -
        new Date(second.deliveryDatetime).getTime()
      );
    })
    .forEach((order) => {
      const branchName = getOrderBranchName(order);
      const recommendations = (order.items?.length ? order.items : [null]).map(
        (item) => ({ order, item }),
      );

      branchGroups.set(branchName, [
        ...(branchGroups.get(branchName) ?? []),
        ...recommendations,
      ]);
    });

  const sections = [...branchGroups.entries()].map(
    ([branchName, branchRecommendations]): ReportSection => ({
      title: branchName,
      items: branchRecommendations.map((recommendation, recommendationIndex) =>
        buildReportItem(recommendation, recommendationIndex + 1),
      ),
    }),
  );

  return {
    summaryLines: [],
    sections,
  };
}
