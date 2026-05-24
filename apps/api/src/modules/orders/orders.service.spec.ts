import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  const prisma: any = {
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    orderStatusHistory: {
      create: jest.fn(),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const auditService: any = {
    log: jest.fn(),
  };

  const notificationsService: any = {
    pushInternalNotification: jest.fn(),
  };

  let service: OrdersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrdersService(prisma, auditService, notificationsService);
  });

  it('rejects when deposit exceeds total', async () => {
    await expect(
      service.create(
        {
          shopId: 'shop-1',
          customerName: 'Customer',
          customerPhone: '0500000000',
          deliveryDatetime: new Date().toISOString(),
          totalPrice: 100,
          depositAmount: 150,
          paymentStatus: 'Partial' as never,
          isUrgent: false,
          items: [],
        },
        {
          sub: 'user-1',
          role: 'Admin' as never,
          shopId: null,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a new order when payload is valid', async () => {
    prisma.order.create = jest.fn().mockResolvedValue({
      id: 'order-1',
      status: 'New',
      shop: { id: 'shop-1' },
      items: [],
    });

    const result = await service.create(
      {
        shopId: 'shop-1',
        customerName: 'Customer',
        customerPhone: '0500000000',
        deliveryDatetime: new Date().toISOString(),
        totalPrice: 100,
        depositAmount: 50,
        paymentStatus: 'Partial' as never,
        isUrgent: true,
        notes: 'Urgent order',
        items: [],
      },
      {
        sub: 'user-1',
        role: 'Admin' as never,
        shopId: null,
      },
    );

    expect(result.id).toBe('order-1');
    expect(prisma.orderStatusHistory.create).toHaveBeenCalled();
  });
});
