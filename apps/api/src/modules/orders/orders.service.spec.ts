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
    shop: {
      findUnique: jest.fn(),
    },
  };

  const auditService: any = {
    log: jest.fn(),
  };

  let service: OrdersService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.shop.findUnique.mockResolvedValue({ id: 'shop-1' });
    service = new OrdersService(prisma, auditService);
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


  it('uses the actor shop when a shop user creates an order without shopId', async () => {
    prisma.order.create = jest.fn().mockResolvedValue({
      id: 'order-branch-scoped',
      status: 'New',
      shop: { id: 'shop-actor' },
      items: [],
    });
    prisma.shop.findUnique.mockResolvedValue({ id: 'shop-actor' });

    await service.create(
      {
        customerName: 'Customer',
        customerPhone: '0500000000',
        deliveryDatetime: new Date().toISOString(),
        totalPrice: 100,
        depositAmount: 50,
        paymentStatus: 'Partial' as never,
        isUrgent: false,
        items: [],
      },
      {
        sub: 'user-branch',
        role: 'ShopEmployee' as never,
        shopId: 'shop-actor',
      },
    );

    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shopId: 'shop-actor',
          moldDeliveryShopId: 'shop-actor',
        }),
      }),
    );
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
    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          moldDeliveryShopId: 'shop-1',
        }),
      }),
    );
    expect(prisma.orderStatusHistory.create).toHaveBeenCalled();
  });

  it('stores the selected mold type and color', async () => {
    prisma.order.create = jest.fn().mockResolvedValue({
      id: 'order-mold',
      orderNumber: 'SP-MOLD-1',
      customerName: 'Customer',
      status: 'New',
      items: [],
    });

    await service.create(
      {
        shopId: 'shop-1',
        customerName: 'Customer',
        customerPhone: '0500000000',
        deliveryDatetime: new Date().toISOString(),
        totalPrice: 100,
        depositAmount: 50,
        paymentStatus: 'Partial' as never,
        isUrgent: false,
        items: [
          {
            itemKind: 'Mold' as never,
            hasTopDecoration: false,
            layers: 1,
            shape: 'Round' as never,
            moldFlavor: 'Cream' as never,
            moldInnerColor: 'White' as never,
            moldColor: 'White',
            hasFillings: false,
            withFoam: false,
            finishType: 'None' as never,
            peopleCount: 8,
            referenceImages: [],
          },
        ],
      },
      {
        sub: 'user-1',
        role: 'Admin' as never,
        shopId: null,
      },
    );

    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: {
            create: [
              expect.objectContaining({
                moldFlavor: 'Cream',
                moldInnerColor: 'White',
                moldColor: 'White',
              }),
            ],
          },
        }),
      }),
    );
  });

  it('accepts the factory as a delivery location', async () => {
    prisma.order.create = jest.fn().mockResolvedValue({
      id: 'order-factory-delivery',
      status: 'New',
      items: [],
    });
    prisma.shop.findUnique.mockResolvedValue({ id: 'factory-1' });

    await service.create(
      {
        shopId: 'shop-1',
        moldDeliveryShopId: 'factory-1',
        customerName: 'Customer',
        customerPhone: '0500000000',
        deliveryDatetime: new Date().toISOString(),
        totalPrice: 100,
        depositAmount: 50,
        paymentStatus: 'Partial' as never,
        isUrgent: false,
        items: [],
      },
      {
        sub: 'user-1',
        role: 'Admin' as never,
        shopId: null,
      },
    );

    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          moldDeliveryShopId: 'factory-1',
        }),
      }),
    );
  });

  it('allows the factory to move a new order directly into production', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-new',
      shopId: 'shop-1',
      status: 'New',
    });
    prisma.order.update.mockResolvedValue({
      id: 'order-new',
      orderNumber: 'SP-NEW-2',
      shopId: 'shop-1',
      status: 'In_Production',
    });

    await service.changeStatus(
      'order-new',
      'In_Production' as never,
      {
        sub: 'factory-user',
        role: 'FactoryManager' as never,
        shopId: 'factory-1',
      },
    );

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-new' },
        data: { status: 'In_Production' },
      }),
    );
  });

  it('keeps submit as a no-op so new orders do not wait for review', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-new',
      shopId: 'shop-1',
      status: 'New',
      items: [],
    });

    const result = await service.submit('order-new', {
      sub: 'shop-user',
      role: 'ShopEmployee' as never,
      shopId: 'shop-1',
    });

    expect(result.status).toBe('New');
    expect(prisma.order.update).not.toHaveBeenCalled();
  });
});
