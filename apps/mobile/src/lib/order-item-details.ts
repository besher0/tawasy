import {
  cakeFinishLabel,
  cakeShapeWithTextLabel,
  moldFlavorLabel,
  moldInnerColorLabel,
} from './labels';

export interface DisplayOrderItem {
  itemKind: string;
  pieceType?: string | null;
  hasTopDecoration?: boolean;
  layers?: number;
  shape?: string | null;
  shapeText?: string | null;
  moldOrderType?: string | null;
  fridgeMoldName?: string | null;
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
}

export interface BuildOrderItemDisplayOptions {
  showEmptyProductionOptions?: boolean;
}

export function buildOrderItemDisplay(
  item: DisplayOrderItem,
  options: BuildOrderItemDisplayOptions = {},
) {
  const showEmptyProductionOptions = options.showEmptyProductionOptions ?? true;
  const notes = item.specialDetails?.trim() || '-';
  const baseDetails =
    item.moldBaseType === 'Foam'
      ? `مع فلين${item.foamCount ? ` (${item.foamCount})` : ''}`
      : item.moldBaseType === 'Cake'
        ? `كيك${item.cakeLayerCount ? ` (${item.cakeLayerCount} طبقات)` : ''}`
        : showEmptyProductionOptions
          ? 'بدون فلين'
          : null;
  const finishDetails =
    !showEmptyProductionOptions &&
    (!item.finishType || item.finishType === 'None')
      ? null
      : cakeFinishLabel(item.finishType);
  const writing = item.writingText?.trim() || 'مافي كتابة';
  const layerColors = item.moldLayerColors?.trim();
  const innerColorDetails =
    item.moldInnerColor === 'Mixed'
      ? `${moldInnerColorLabel(item.moldInnerColor)} - ${layerColors || 'غير محدد'}`
      : moldInnerColorLabel(item.moldInnerColor);

  if (item.itemKind === 'Pieces') {
    const details = [
      `عدد القطع: ${item.peopleCount ?? '-'}`,
      `عدد الطبقات: ${item.layers ?? '-'}`,
      `نوع القطع: ${item.pieceType?.trim() || '-'}`,
      `هل يوجد فوقها شيء: ${item.hasTopDecoration ? 'نعم' : 'لا'}`,
      `الملاحظات والإضافات الأخرى: ${notes}`,
    ];

    return {
      title: 'قطع',
      text: `قطع، ${details.join('، ')}`,
    };
  }

  if (item.moldOrderType === 'FRIDGE') {
    const fridgeName = item.fridgeMoldName?.trim() || '-';

    return {
      title: 'قالب براد',
      text: [
        'قالب براد',
        `اسم القالب: ${fridgeName}`,
        `الكتابة: ${writing}`,
        `الملاحظات: ${notes}`,
      ].join('، '),
    };
  }

  const details = [
    innerColorDetails,
    cakeShapeWithTextLabel(item.shape, item.shapeText),
    item.hasFillings ? item.filling?.trim() || 'يوجد حشوة' : null,
    baseDetails,
    `${item.layers ?? '-'}`,
    moldFlavorLabel(item.moldFlavor),
    item.moldColor?.trim() || '-',
    finishDetails,
    writing,
    `الملاحظات والإضافات الأخرى: ${notes}`,
  ].filter((detail): detail is string => Boolean(detail));

  return {
    title: 'قالب',
    text: `قالب ${item.peopleCount ?? '-'}، ${details.join('، ')}`,
  };
}
