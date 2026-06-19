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
      foamCount: 2,
      layers: 3,
      finishType: 'Covering',
      specialDetails: 'كتابة اسم',
      writingText: 'عيد ميلاد سعيد',
    });

    expect(display).toEqual({
      title: 'قالب',
      text:
        'قالب، عدد الأشخاص: 12، عدد الطوابق: 3، لون القالب من الداخل: أبيض، نوع القالب: شوكولا، اللون الخارجي للقالب: زهري، نوع الحشوة: فستق، شكل القالب: دائري، الفلين: مع فلين - العدد: 2، التجهيز الخارجي: تلبيس، الملاحظات والإضافات الأخرى: كتابة اسم، الكتابة الخاصة بالقالب: عيد ميلاد سعيد',
    });
  });

  it('shows no writing when mold writing is empty', () => {
    const display = buildOrderItemDisplay({
      itemKind: 'Mold',
      peopleCount: 8,
      layers: 1,
      moldInnerColor: 'Black',
      moldFlavor: 'Cream',
      moldColor: 'أبيض',
      hasFillings: false,
      shape: 'Square',
      withFoam: false,
      finishType: 'None',
      specialDetails: '',
      writingText: '   ',
    });

    expect(display.text.endsWith('الكتابة الخاصة بالقالب: مافي كتابة')).toBe(true);
  });

  it('shows layer colors when the inner mold color is mixed', () => {
    const display = buildOrderItemDisplay({
      itemKind: 'Mold',
      peopleCount: 10,
      layers: 2,
      moldInnerColor: 'Mixed',
      moldLayerColors: 'الأول أبيض، الثاني شوكولا',
      moldFlavor: 'Cream',
      moldColor: 'أزرق',
      hasFillings: false,
      shape: 'Round',
      withFoam: false,
      finishType: 'None',
    });

    expect(display.text).toContain(
      'لون القالب من الداخل: مشكل - ألوان الطبقات: الأول أبيض، الثاني شوكولا',
    );
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
