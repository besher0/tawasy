import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  const prisma: any = {
    order: {
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({
        _sum: { totalPrice: null },
        _count: { _all: 0 },
      }),
    },
    orderItem: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    shop: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    analyticsSnapshot: {
      createMany: jest.fn(),
    },
  };

  const cache: any = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
  };

  let service: AnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.order.aggregate.mockResolvedValue({
      _sum: { totalPrice: null },
      _count: { _all: 0 },
    });
    service = new AnalyticsService(prisma, cache);
  });

  it('returns overview metrics object', async () => {
    const overview = await service.getOverview();
    expect(overview).toHaveProperty('totalSales');
    expect(overview).toHaveProperty('totalOrders');
  });

  it('calculates delivered and undelivered totals for the requested day', async () => {
    const start = '2026-06-10T00:00:00.000Z';
    const end = '2026-06-11T00:00:00.000Z';
    prisma.order.aggregate
      .mockResolvedValueOnce({
        _sum: { totalPrice: 350 },
        _count: { _all: 2 },
      })
      .mockResolvedValueOnce({
        _sum: { totalPrice: 125 },
        _count: { _all: 1 },
      });

    const result = await service.getDeliveryTotals(
      { start, end },
      {
        sub: 'admin-user',
        role: 'Admin' as never,
        shopId: null,
      },
    );

    expect(result).toMatchObject({
      deliveredTotal: 350,
      deliveredCount: 2,
      undeliveredTotal: 125,
      undeliveredCount: 1,
    });
    expect(prisma.order.aggregate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'Delivered',
          deliveredAt: {
            gte: new Date(start),
            lt: new Date(end),
          },
        }),
      }),
    );
    expect(prisma.order.aggregate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            notIn: ['Delivered', 'Cancelled'],
          },
          deliveryDatetime: {
            lt: new Date(end),
          },
        }),
      }),
    );
  });

  it('scopes delivery totals to the actor shop for shop users', async () => {
    const start = '2026-06-10T00:00:00.000Z';
    const end = '2026-06-11T00:00:00.000Z';

    await service.getDeliveryTotals(
      { start, end, shopId: 'other-shop' },
      {
        sub: 'shop-user',
        role: 'ShopEmployee' as never,
        shopId: 'shop-1',
      },
    );

    expect(prisma.order.aggregate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          shopId: 'shop-1',
        }),
      }),
    );
    expect(prisma.order.aggregate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          shopId: 'shop-1',
        }),
      }),
    );
  });
});
