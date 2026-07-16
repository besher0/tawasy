import { buildFactoryOrderReport } from './factory-order-report';

function expectedTime(value: string) {
  return new Date(value).toLocaleTimeString('ar-SY', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Damascus',
  });
}

describe('buildFactoryOrderReport', () => {
  it('numbers each order item as a recommendation inside its branch without exposing order identity', () => {
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
            id: 'pieces',
            itemKind: 'Pieces',
            pieceType: 'كب كيك',
            peopleCount: 24,
            referenceImages: ['https://example.com/pieces.jpg'],
          },
        ],
      },
      {
        orderNumber: 'B-20',
        customerName: 'زبون ثاني',
        deliveryDatetime: '2026-07-13T10:00:00.000Z',
        isUrgent: false,
        shop: { name: 'فرع ب' },
        items: [
          {
            id: 'chocolate-mold',
            itemKind: 'Mold',
            moldInnerColor: 'Black',
            peopleCount: 8,
          },
        ],
      },
      {
        orderNumber: 'A-20',
        customerName: 'زبون أ',
        deliveryDatetime: '2026-07-13T09:00:00.000Z',
        isUrgent: false,
        shop: { name: 'فرع أ' },
        items: [
          {
            id: 'second-chocolate-mold',
            itemKind: 'Mold',
            moldInnerColor: 'Black',
            peopleCount: 16,
          },
        ],
      },
    ]);

    expect(report.summaryLines).toEqual([]);
    expect(report.sections.map((section) => section.title)).toEqual([
      'فرع أ',
      'فرع ب',
    ]);
    expect(report.sections[0].items?.map((item) => item.title)).toEqual([
      'توصاية رقم 1',
    ]);
    expect(report.sections[1].items?.map((item) => item.title)).toEqual([
      'توصاية رقم 1',
      'توصاية رقم 2',
      'توصاية رقم 3',
    ]);
    expect(report.sections[0].groups).toBeUndefined();

    const firstBranchBItem = report.sections[1].items?.[0];
    expect(firstBranchBItem?.metaLines).toEqual([
      `ساعة التسليم: ${expectedTime('2026-07-13T10:00:00.000Z')}`,
      'الفرع: فرع ب',
    ]);
    expect(firstBranchBItem?.lines.join(' ')).toContain('قالب 8');
    expect(firstBranchBItem?.lines.join(' ')).not.toContain('B-20');
    expect(firstBranchBItem?.lines.join(' ')).not.toContain('زبون ثاني');

    const secondBranchBItem = report.sections[1].items?.[1];
    expect(secondBranchBItem?.metaLines).toEqual([
      `ساعة التسليم: ${expectedTime('2026-07-13T12:00:00.000Z')}`,
      'الفرع: فرع التسليم',
    ]);
    expect(secondBranchBItem?.lines.join(' ')).toContain('قالب 12');
    expect(secondBranchBItem?.lines.join(' ')).not.toContain('قطع');
    expect(secondBranchBItem?.images).toEqual([
      {
        url: 'https://example.com/milk.jpg',
        caption: 'توصاية رقم 2 - صورة 1',
      },
    ]);

    const thirdBranchBItem = report.sections[1].items?.[2];
    expect(thirdBranchBItem?.lines.join(' ')).toContain('قطع');
    expect(thirdBranchBItem?.images).toEqual([
      {
        url: 'https://example.com/pieces.jpg',
        caption: 'توصاية رقم 3 - صورة 1',
      },
    ]);
  });

  it('keeps a printable card for an order with no item details', () => {
    const report = buildFactoryOrderReport([
      {
        orderNumber: 'A-1',
        customerName: 'زبون',
        deliveryDatetime: '2026-07-13T10:00:00.000Z',
        isUrgent: false,
        shop: null,
        items: [],
      },
    ]);

    expect(report.sections[0]).toMatchObject({
      title: 'فرع غير محدد',
      items: [
        {
          title: 'توصاية رقم 1',
          lines: ['لا توجد تفاصيل توصاية.'],
        },
      ],
    });
  });
});
