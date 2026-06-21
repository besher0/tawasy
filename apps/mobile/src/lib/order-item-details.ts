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
}

export function buildOrderItemDisplay(item: DisplayOrderItem) {
  const notes = item.specialDetails?.trim() || '-';
  const foamDetails = item.withFoam
    ? `مع فلين${item.foamCount ? ` (${item.foamCount})` : ''}`
    : 'بدون فلين';
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

  const details = [
    innerColorDetails,
    cakeShapeLabel(item.shape),
    item.hasFillings ? item.filling?.trim() || 'يوجد حشوة' : null,
    foamDetails,
    `${item.layers ?? '-'}`,
    moldFlavorLabel(item.moldFlavor),
    item.moldColor?.trim() || '-',
    cakeFinishLabel(item.finishType),
    writing,
    `الملاحظات والإضافات الأخرى: ${notes}`,
  ].filter((detail): detail is string => Boolean(detail));

  return {
    title: 'قالب',
    text: `قالب ${item.peopleCount ?? '-'}، ${details.join('، ')}`,
  };
}
