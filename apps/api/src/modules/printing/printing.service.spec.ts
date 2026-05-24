import { NotFoundException } from '@nestjs/common';
import { PrintingService } from './printing.service';

describe('PrintingService', () => {
  const prisma = {
    order: {
      findUnique: jest.fn().mockResolvedValue(null),
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
});