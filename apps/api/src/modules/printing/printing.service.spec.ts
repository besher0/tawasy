import { NotFoundException } from '@nestjs/common';
import { PrintingService } from './printing.service';

describe('PrintingService', () => {
  const prisma = {
    order: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    dailyEssential: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    printer: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
    },
    printJob: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  } as never;

  const audit = { log: jest.fn() } as never;

  let service: PrintingService;

  beforeEach(() => {
    service = new PrintingService(prisma, audit);
  });

  it('throws if order is missing when generating pdf', async () => {
    await expect(service.generateProductionSheet('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('generates branch orders and daily essentials pdf files', async () => {
    const actor = {
      sub: 'user-id',
      role: 'FactoryManager',
      name: 'Factory',
      phone: '0999999999',
    };

    const ordersPdf = await service.generateOrdersByBranch({ actor });
    const essentialsPdf = await service.generateDailyEssentialsByBranch({ actor });

    expect(ordersPdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(essentialsPdf.subarray(0, 4).toString()).toBe('%PDF');
  });
});
