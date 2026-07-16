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
      moldBaseType: 'Foam',
      foamCount: 2,
      layers: 3,
      finishType: 'Covering',
      specialDetails: 'كتابة اسم',
      writingText: 'عيد ميلاد سعيد',
    });

    expect(display).toEqual({
      title: 'قالب',
      text: 'قالب 12، حليب، دائري، فستق، مع فلين (2)، 3، شوكولا، زهري، نكبر ونلبس الديسك، عيد ميلاد سعيد، الملاحظات والإضافات الأخرى: كتابة اسم',
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
      moldBaseType: 'None',
      finishType: 'None',
      specialDetails: '',
      writingText: '   ',
    });

    expect(display.text).toBe(
      'قالب 8، شوكولا، مربع، بدون فلين، 1، كريمة، أبيض، مافي تكبير ديسك، مافي كتابة، الملاحظات والإضافات الأخرى: -',
    );
    expect(display.text).not.toContain('نوع الحشوة');
    expect(display.text).not.toContain('لون القالب من الداخل');
  });

  it('can hide empty foam and disk enlargement options for print reports', () => {
    const display = buildOrderItemDisplay(
      {
        itemKind: 'Mold',
        peopleCount: 8,
        layers: 1,
        moldInnerColor: 'Black',
        moldFlavor: 'Cream',
        moldColor: 'أبيض',
        hasFillings: false,
        shape: 'Square',
        moldBaseType: 'None',
        finishType: 'None',
        specialDetails: '',
        writingText: '   ',
      },
      { showEmptyProductionOptions: false },
    );

    expect(display.text).toBe(
      'قالب 8، شوكولا، مربع، 1، كريمة، أبيض، مافي كتابة، الملاحظات والإضافات الأخرى: -',
    );
    expect(display.text).not.toContain('بدون فلين');
    expect(display.text).not.toContain('مافي تكبير ديسك');
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
      moldBaseType: 'None',
      finishType: 'None',
    });

    expect(display.text).toContain('مشكل - الأول أبيض، الثاني شوكولا');
  });

  it('shows the independent cake layer count', () => {
    const display = buildOrderItemDisplay({
      itemKind: 'Mold',
      peopleCount: 10,
      layers: 2,
      moldInnerColor: 'White',
      moldFlavor: 'Cream',
      moldColor: 'زهري',
      hasFillings: false,
      shape: 'Round',
      moldBaseType: 'Cake',
      cakeLayerCount: 3,
      finishType: 'Disk_Enlargement',
    });

    expect(display.text).toContain('كيك (3 طبقات)');
    expect(display.text).toContain('نكبر الديسك');
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
      text: 'قطع، عدد القطع: 24، عدد الطبقات: 2، نوع القطع: كب كيك، هل يوجد فوقها شيء: نعم، الملاحظات والإضافات الأخرى: لون أزرق',
    });
  });
});
