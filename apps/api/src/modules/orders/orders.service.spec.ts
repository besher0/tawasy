import { BadRequestException } from "@nestjs/common";
import { OrdersService } from "./orders.service";

describe("OrdersService", () => {
  const prisma: any = {
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
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
    prisma.shop.findUnique.mockResolvedValue({ id: "shop-1" });
    service = new OrdersService(prisma, auditService);
  });

  it("rejects when deposit exceeds total", async () => {
    await expect(
      service.create(
        {
          shopId: "shop-1",
          customerName: "Customer",
          customerPhone: "0500000000",
          deliveryDatetime: new Date().toISOString(),
          totalPrice: 100,
          depositAmount: 150,
          paymentStatus: "Partial" as never,
          isUrgent: false,
          items: [],
        },
        {
          sub: "user-1",
          role: "Admin" as never,
          shopId: null,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("uses the actor shop when a shop user creates an order without shopId", async () => {
    prisma.order.create = jest.fn().mockResolvedValue({
      id: "order-branch-scoped",
      status: "New",
      shop: { id: "shop-actor" },
      items: [],
    });
    prisma.shop.findUnique.mockResolvedValue({ id: "shop-actor" });

    await service.create(
      {
        customerName: "Customer",
        customerPhone: "0500000000",
        deliveryDatetime: new Date().toISOString(),
        totalPrice: 100,
        depositAmount: 50,
        paymentStatus: "Partial" as never,
        isUrgent: false,
        items: [],
      },
      {
        sub: "user-branch",
        role: "ShopEmployee" as never,
        shopId: "shop-actor",
      },
    );

    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shopId: "shop-actor",
          moldDeliveryShopId: "shop-actor",
        }),
      }),
    );
  });

  it("creates a new order when payload is valid", async () => {
    prisma.order.create = jest.fn().mockResolvedValue({
      id: "order-1",
      status: "New",
      shop: { id: "shop-1" },
      items: [],
    });

    const result = await service.create(
      {
        shopId: "shop-1",
        customerName: "Customer",
        customerPhone: "0500000000",
        deliveryDatetime: new Date().toISOString(),
        totalPrice: 100,
        depositAmount: 50,
        paymentStatus: "Partial" as never,
        isUrgent: true,
        notes: "Urgent order",
        items: [],
      },
      {
        sub: "user-1",
        role: "Admin" as never,
        shopId: null,
      },
    );

    expect(result.id).toBe("order-1");
    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          moldDeliveryShopId: "shop-1",
        }),
      }),
    );
    expect(prisma.orderStatusHistory.create).toHaveBeenCalled();
  });

  it("stores the selected mold type and color", async () => {
    prisma.order.create = jest.fn().mockResolvedValue({
      id: "order-mold",
      orderNumber: "SP-MOLD-1",
      customerName: "Customer",
      status: "New",
      items: [],
    });

    await service.create(
      {
        shopId: "shop-1",
        customerName: "Customer",
        customerPhone: "0500000000",
        deliveryDatetime: new Date().toISOString(),
        totalPrice: 100,
        depositAmount: 50,
        paymentStatus: "Partial" as never,
        isUrgent: false,
        items: [
          {
            itemKind: "Mold" as never,
            hasTopDecoration: false,
            layers: 1,
            shape: "Round" as never,
            moldFlavor: "Cream" as never,
            moldInnerColor: "White" as never,
            moldColor: "White",
            hasFillings: false,
            withFoam: false,
            finishType: "None" as never,
            peopleCount: 8,
            referenceImages: [],
          },
        ],
      },
      {
        sub: "user-1",
        role: "Admin" as never,
        shopId: null,
      },
    );

    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: {
            create: [
              expect.objectContaining({
                moldFlavor: "Cream",
                moldInnerColor: "White",
                moldColor: "White",
              }),
            ],
          },
        }),
      }),
    );
  });

  it("accepts the factory as a delivery location", async () => {
    prisma.order.create = jest.fn().mockResolvedValue({
      id: "order-factory-delivery",
      status: "New",
      items: [],
    });
    prisma.shop.findUnique.mockResolvedValue({ id: "factory-1" });

    await service.create(
      {
        shopId: "shop-1",
        moldDeliveryShopId: "factory-1",
        customerName: "Customer",
        customerPhone: "0500000000",
        deliveryDatetime: new Date().toISOString(),
        totalPrice: 100,
        depositAmount: 50,
        paymentStatus: "Partial" as never,
        isUrgent: false,
        items: [],
      },
      {
        sub: "user-1",
        role: "Admin" as never,
        shopId: null,
      },
    );

    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          moldDeliveryShopId: "factory-1",
        }),
      }),
    );
  });

  it("allows the factory to move a new order directly into production", async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: "order-new",
      shopId: "shop-1",
      status: "New",
    });
    prisma.order.update.mockResolvedValue({
      id: "order-new",
      orderNumber: "SP-NEW-2",
      shopId: "shop-1",
      status: "In_Production",
    });

    await service.changeStatus("order-new", "In_Production" as never, {
      sub: "factory-user",
      role: "FactoryManager" as never,
      shopId: "factory-1",
    });

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order-new" },
        data: { status: "In_Production" },
      }),
    );
  });

  it("filters orders by local delivery day when a date is provided", async () => {
    prisma.order.findMany.mockResolvedValue([]);

    await service.findAll(
      { date: "2026-06-30" },
      {
        sub: "admin-user",
        role: "Admin" as never,
        shopId: null,
      },
    );

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deliveryDatetime: {
            gte: new Date(2026, 5, 30),
            lt: new Date(2026, 6, 1),
          },
        }),
      }),
    );
  });

  it("keeps submit as a no-op so new orders do not wait for review", async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: "order-new",
      shopId: "shop-1",
      status: "New",
      items: [],
    });

    const result = await service.submit("order-new", {
      sub: "shop-user",
      role: "ShopEmployee" as never,
      shopId: "shop-1",
    });

    expect(result.status).toBe("New");
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it("allows editing products after the order reaches production", async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: "order-production",
      shopId: "shop-1",
      status: "In_Production",
      totalPrice: 100,
      depositAmount: 50,
    });
    prisma.order.update.mockResolvedValue({
      id: "order-production",
      shopId: "shop-1",
      status: "In_Production",
      items: [],
    });

    await service.update(
      "order-production",
      {
        notes: "Updated instructions",
        items: [
          {
            itemKind: "Mold" as never,
            hasTopDecoration: false,
            layers: 2,
            shape: "Round" as never,
            moldFlavor: "Chocolate" as never,
            moldInnerColor: "White" as never,
            moldColor: "Blue",
            hasFillings: false,
            withFoam: false,
            finishType: "None" as never,
            peopleCount: 10,
            referenceImages: ["https://images.example.com/order-reference.jpg"],
          },
        ],
      },
      {
        sub: "shop-user",
        role: "ShopEmployee" as never,
        shopId: "shop-1",
      },
    );

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order-production" },
        data: expect.objectContaining({
          items: expect.objectContaining({
            deleteMany: {},
            create: [
              expect.objectContaining({
                moldColor: "Blue",
                referenceImages: [
                  "https://images.example.com/order-reference.jpg",
                ],
              }),
            ],
          }),
        }),
      }),
    );
    expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          previousStatus: "In_Production",
          newStatus: "In_Production",
          note: "Order details updated",
        }),
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ORDER_UPDATED" }),
    );
  });

  it("allows cancelling a ready order", async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: "order-ready",
      shopId: "shop-1",
      status: "Ready",
    });
    prisma.order.update.mockResolvedValue({
      id: "order-ready",
      shopId: "shop-1",
      status: "Cancelled",
      items: [],
    });

    const result = await service.cancel("order-ready", {
      sub: "shop-user",
      role: "ShopEmployee" as never,
      shopId: "shop-1",
    });

    expect(result.status).toBe("Cancelled");
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order-ready" },
        data: { status: "Cancelled" },
      }),
    );
  });

  it("keeps cancellation successful when status history cannot be recorded", async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: "order-ready",
      shopId: "shop-1",
      status: "Ready",
    });
    prisma.order.update.mockResolvedValue({
      id: "order-ready",
      shopId: "shop-1",
      status: "Cancelled",
      items: [],
    });
    prisma.orderStatusHistory.create.mockRejectedValueOnce(
      new Error("history unavailable"),
    );

    const result = await service.cancel("order-ready", {
      sub: "shop-user",
      role: "ShopEmployee" as never,
      shopId: "shop-1",
    });

    expect(result.status).toBe("Cancelled");
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ORDER_STATUS_CHANGED",
        entityId: "order-ready",
      }),
    );
  });

  it("treats cancelling an already cancelled order as a no-op", async () => {
    prisma.order.findUnique
      .mockResolvedValueOnce({
        id: "order-cancelled",
        shopId: "shop-1",
        status: "Cancelled",
      })
      .mockResolvedValueOnce({
        id: "order-cancelled",
        shopId: "shop-1",
        status: "Cancelled",
        items: [],
      });

    const result = await service.cancel("order-cancelled", {
      sub: "shop-user",
      role: "ShopEmployee" as never,
      shopId: "shop-1",
    });

    expect(result.status).toBe("Cancelled");
    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(prisma.orderStatusHistory.create).not.toHaveBeenCalled();
  });

  it("records the actual delivery time when delivery is confirmed", async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: "order-ready",
      shopId: "shop-1",
      status: "Ready",
    });
    prisma.order.update.mockResolvedValue({
      id: "order-ready",
      shopId: "shop-1",
      status: "Delivered",
      deliveredAt: new Date(),
      items: [],
    });

    await service.confirmDelivery("order-ready", {
      sub: "factory-user",
      role: "FactoryManager" as never,
      shopId: "factory-1",
    });

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order-ready" },
        data: {
          status: "Delivered",
          deliveredAt: expect.any(Date),
        },
      }),
    );
  });

  it.each(["New", "Reviewing", "In_Production", "Ready"])(
    "allows confirming delivery from %s",
    async (status) => {
      prisma.order.findUnique.mockResolvedValue({
        id: "order-active",
        shopId: "shop-1",
        status,
      });
      prisma.order.update.mockResolvedValue({
        id: "order-active",
        shopId: "shop-1",
        status: "Delivered",
        deliveredAt: new Date(),
        items: [],
      });

      const result = await service.confirmDelivery("order-active", {
        sub: "shop-user",
        role: "ShopEmployee" as never,
        shopId: "shop-1",
      });

      expect(result.status).toBe("Delivered");
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "order-active" },
          data: {
            status: "Delivered",
            deliveredAt: expect.any(Date),
          },
        }),
      );
    },
  );

  it("rejects delivery confirmation for a cancelled order", async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: "order-cancelled",
      shopId: "shop-1",
      status: "Cancelled",
    });

    await expect(
      service.confirmDelivery("order-cancelled", {
        sub: "shop-user",
        role: "ShopEmployee" as never,
        shopId: "shop-1",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it("keeps delivery confirmation idempotent for delivered orders", async () => {
    const deliveredAt = new Date("2026-06-05T09:30:00.000Z");
    prisma.order.findUnique
      .mockResolvedValueOnce({
        id: "order-delivered",
        shopId: "shop-1",
        status: "Delivered",
        deliveredAt,
      })
      .mockResolvedValueOnce({
        id: "order-delivered",
        shopId: "shop-1",
        status: "Delivered",
        deliveredAt,
        items: [],
      });

    const result = await service.confirmDelivery("order-delivered", {
      sub: "shop-user",
      role: "ShopEmployee" as never,
      shopId: "shop-1",
    });

    expect(result.deliveredAt).toBe(deliveredAt);
    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(prisma.orderStatusHistory.create).not.toHaveBeenCalled();
  });

  it("deletes delivered orders after the five-day retention period", async () => {
    const deliveredAt = new Date("2026-06-01T10:00:00.000Z");
    prisma.order.findMany.mockResolvedValue([
      {
        id: "expired-order",
        orderNumber: "SP-EXPIRED",
        deliveredAt,
      },
    ]);
    prisma.order.deleteMany.mockResolvedValue({ count: 1 });

    const deletedCount = await service.purgeExpiredDeliveredOrders(
      new Date("2026-06-06T10:00:01.000Z"),
    );

    expect(deletedCount).toBe(1);
    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: {
        status: "Delivered",
        deliveredAt: { lte: new Date("2026-06-01T10:00:01.000Z") },
      },
      select: {
        id: true,
        orderNumber: true,
        deliveredAt: true,
      },
    });
    expect(prisma.order.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ["expired-order"] },
          status: "Delivered",
        }),
      }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ORDER_AUTO_DELETED",
        entityId: "expired-order",
      }),
    );
  });
});
