import { buildFactoryOrderReport } from './factory-order-report';

describe('buildFactoryOrderReport', () => {
  it('counts molds and groups every visible item by branch and inner color', () => {
    const report = buildFactoryOrderReport([
      {
        orderNumber: 'B-10',
        customerName: 'زبون ب',
        deliveryDatetime: '2026-07-13T12:00:00.000Z',
        isUrgent: true,
        notes: 'ملاحظة الطلب',
        shop: { name: 'فرع ب' },
        moldDeliveryShop: { name: 'فرع التسليم' },
        items: [
          {
            id: 'milk-mold',
            itemKind: 'Mold',
            moldInnerColor: 'White',
            moldBaseType: 'Foam',
            foamCount: 2,
            cakeLayerCount: null,
            peopleCount: 12,
            referenceImages: ['https://example.com/milk.jpg'],
          },
          {
            id: 'chocolate-mold',
            itemKind: 'Mold',
            moldInnerColor: 'Black',
            moldBaseType: 'Cake',
            cakeLayerCount: 3,
            peopleCount: 16,
            referenceImages: [],
          },
          {
            id: 'mixed-mold',
            itemKind: 'Mold',
            moldInnerColor: 'Mixed',
            moldLayerColors: 'حليب وشوكولا',
            peopleCount: 20,
          },
          {
            id: 'pieces',
            itemKind: 'Pieces',
            pieceType: 'كب كيك',
            peopleCount: 24,
            referenceImages: ['https://example.com/pieces.jpg'],
          },
        ],
      },
      {
        orderNumber: 'A-20',
        customerName: 'زبون أ',
        deliveryDatetime: '2026-07-13T10:00:00.000Z',
        isUrgent: false,
        shop: { name: 'فرع أ' },
        items: [
          {
            id: 'second-chocolate-mold',
            itemKind: 'Mold',
            moldInnerColor: 'Black',
            peopleCount: 8,
          },
        ],
      },
    ]);

    expect(report).toMatchObject({
      milkMoldCount: 1,
      chocolateMoldCount: 2,
      mixedMoldCount: 1,
      summaryLines: [
        'مجمل عدد القوالب التي لونها من الداخل حليب: 1',
        'مجمل عدد القوالب التي لونها من الداخل شوكولا: 2',
      ],
    });

    const branchB = report.sections.find((section) => section.title === 'فرع ب');
    expect(branchB?.groups?.map((group) => group.title)).toEqual([
      'قلب حليب (1)',
      'قلب شوكولا (1)',
      'قلب مشكل (1)',
      'قطع (1)',
    ]);

    const milkItem = branchB?.groups?.[0].items[0];
    expect(milkItem?.title).toBe('طلب B-10 — زبون ب — المنتج 1');
    expect(milkItem?.lines).toEqual(
      expect.arrayContaining([
        'مكان التسليم: فرع التسليم',
        'الأولوية: عاجل',
        'ملاحظات الطلب: ملاحظة الطلب',
        'الصور المرجعية: 1',
      ]),
    );
    expect(milkItem?.lines.join(' ')).toContain('مع فلين (2)');
    expect(branchB?.groups?.[1].items[0].lines.join(' ')).toContain(
      'كيك (3 طبقات)',
    );
    expect(milkItem?.images).toEqual([
      {
        url: 'https://example.com/milk.jpg',
        caption: 'طلب B-10 — المنتج 1 — صورة 1',
      },
    ]);

    expect(branchB?.groups?.[3].items[0].title).toContain('المنتج 4');
    expect(report.sections.map((section) => section.title)).toEqual([
      'فرع أ',
      'فرع ب',
    ]);
  });

  it('keeps molds with a missing or unknown inner color in the mixed group', () => {
    const report = buildFactoryOrderReport([
      {
        orderNumber: 'A-1',
        customerName: 'زبون',
        deliveryDatetime: '2026-07-13T10:00:00.000Z',
        isUrgent: false,
        shop: null,
        items: [
          { id: 'missing', itemKind: 'Mold' },
          { id: 'unknown', itemKind: 'Mold', moldInnerColor: 'Unknown' },
        ],
      },
    ]);

    expect(report.milkMoldCount).toBe(0);
    expect(report.chocolateMoldCount).toBe(0);
    expect(report.mixedMoldCount).toBe(2);
    expect(report.sections[0].title).toBe('فرع غير محدد');
    expect(report.sections[0].groups?.[2]).toMatchObject({
      title: 'قلب مشكل (2)',
    });
  });
});
