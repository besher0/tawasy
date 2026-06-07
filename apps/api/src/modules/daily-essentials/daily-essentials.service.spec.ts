import { BadRequestException } from '@nestjs/common';
import { DailyEssentialsService } from './daily-essentials.service';

describe('DailyEssentialsService', () => {
  const prisma: any = {
    dailyEssential: {
      create: jest.fn(),
    },
  };

  const auditService: any = {
    log: jest.fn(),
  };

  let service: DailyEssentialsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DailyEssentialsService(prisma, auditService);
  });

  it('uses the selected shop when an admin creates an entry', async () => {
    prisma.dailyEssential.create.mockResolvedValue({
      id: 'essential-1',
      shopId: 'branch-1',
    });

    await service.create(
      {
        shopId: 'branch-1',
        category: 'Supplies' as never,
        itemName: 'Boxes',
        quantity: 10,
        status: 'Pending' as never,
        targetDate: '2026-06-08',
      },
      {
        sub: 'admin-1',
        role: 'Admin',
        shopId: null,
      },
    );

    expect(prisma.dailyEssential.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shopId: 'branch-1',
          targetDate: new Date('2026-06-08'),
        }),
      }),
    );
  });

  it('rejects admin creation when no branch is selected', async () => {
    await expect(
      service.create(
        {
          category: 'Supplies' as never,
          itemName: 'Boxes',
          quantity: 10,
          targetDate: '2026-06-08',
        },
        {
          sub: 'admin-1',
          role: 'Admin',
          shopId: null,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
