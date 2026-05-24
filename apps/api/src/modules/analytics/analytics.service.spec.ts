import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  const prisma = {
    order: {
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
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
  } as never;

  const cache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
  } as never;

  let service: AnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AnalyticsService(prisma, cache);
  });

  it('returns overview metrics object', async () => {
    const overview = await service.getOverview();
    expect(overview).toHaveProperty('totalSales');
    expect(overview).toHaveProperty('totalOrders');
  });
});