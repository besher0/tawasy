import { buildOrderItemDisplay } from './order-item-details';

describe('buildOrderItemDisplay', () => {
  it('orders mold details for production reading', () => {
    const display = buildOrderItemDisplay({
      itemKind: 'Mold',
      peopleCount: 12,
      moldInnerColor: 'White',
      moldFlavor: 'Chocolate',
      moldColor: 'زهري',
      hasFillings: true,
      filling: 'فستق',
      shape: 'Round',
      withFoam: true,
      finishType: 'Covering',
      specialDetails: 'كتابة اسم',
    });

    expect(display).toEqual({
      title: 'قالب',
      text:
        'قالب، عدد الأشخاص: 12، لون القالب من الداخل: أبيض، نوع القالب: شوكولا، اللون الخارجي للقالب: زهري، نوع الحشوة: فستق، شكل القالب: دائري، الفلين: مع فلين، التجهيز الخارجي: تلبيس، الملاحظات والإضافات الأخرى: كتابة اسم',
    });
  });

  it('orders pieces details for production reading', () => {
    const display = buildOrderItemDisplay({
      itemKind: 'Pieces',
      peopleCount: 24,
      layers: 2,
      pieceType: 'كب كيك',
      hasTopDecoration: true,
      specialDetails: 'لون أزرق',
    });

    expect(display).toEqual({
      title: 'قطع',
      text:
        'قطع، عدد القطع: 24، عدد الطبقات: 2، نوع القطع: كب كيك، هل يوجد فوقها شيء: نعم، الملاحظات والإضافات الأخرى: لون أزرق',
    });
  });
});
