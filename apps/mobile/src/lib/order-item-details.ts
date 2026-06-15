import {
  cakeFinishLabel,
  cakeShapeLabel,
  moldFlavorLabel,
  moldInnerColorLabel,
} from './labels';

export interface DisplayOrderItem {
  itemKind: string;
  pieceType?: string | null;
  hasTopDecoration?: boolean;
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
}

export function buildOrderItemDisplay(item: DisplayOrderItem) {
  const notes = item.specialDetails?.trim() || '-';

  if (item.itemKind === 'Pieces') {
    return {
      title: 'قطع',
      lines: [
        `عدد القطع: ${item.peopleCount ?? '-'}`,
        `عدد الطبقات: ${item.layers ?? '-'}`,
        `نوع القطع: ${item.pieceType?.trim() || '-'}`,
        `هل يوجد فوقها شيء: ${item.hasTopDecoration ? 'نعم' : 'لا'}`,
        `الملاحظات والإضافات الأخرى: ${notes}`,
      ],
    };
  }

  return {
    title: 'قالب',
    lines: [
      `عدد الأشخاص: ${item.peopleCount ?? '-'}`,
      `لون القالب من الداخل: ${moldInnerColorLabel(item.moldInnerColor)}`,
      `نوع القالب: ${moldFlavorLabel(item.moldFlavor)}`,
      `اللون الخارجي للقالب: ${item.moldColor?.trim() || '-'}`,
      `نوع الحشوة: ${
        item.hasFillings
          ? item.filling?.trim() || 'يوجد حشوة'
          : 'بدون حشوة'
      }`,
      `شكل القالب: ${cakeShapeLabel(item.shape)}`,
      `الفلين: ${item.withFoam ? 'مع فلين' : 'بدون فلين'}`,
      `التجهيز الخارجي: ${cakeFinishLabel(item.finishType)}`,
      `الملاحظات والإضافات الأخرى: ${notes}`,
    ],
  };
}
