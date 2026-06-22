import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { CakeType, Prisma, OrderStatus } from "@prisma/client";
import { MoldInnerColor, UserRole } from "@sugarprecision/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { OrdersQueryDto } from "./dto/orders-query.dto";

interface RequestActor {
  sub: string;
  role: UserRole;
  shopId?: string | null;
}

const editableStatuses: OrderStatus[] = [
  OrderStatus.New,
  OrderStatus.Reviewing,
  OrderStatus.In_Production,
];
const orderResponseInclude = {
  shop: true,
  moldDeliveryShop: true,
  items: true,
} satisfies Prisma.OrderInclude;

const statusTransitions: Record<OrderStatus, OrderStatus[]> = {
  New: [OrderStatus.In_Production, OrderStatus.Cancelled],
  Reviewing: [OrderStatus.In_Production, OrderStatus.Cancelled],
  In_Production: [OrderStatus.Ready, OrderStatus.Cancelled],
  Ready: [OrderStatus.Delivered, OrderStatus.Cancelled],
  Delivered: [],
  Cancelled: [],
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateOrderDto, actor: RequestActor) {
    this.assertDeposit(dto.depositAmount, dto.totalPrice);
    const shopId = this.resolveWritableShopId(actor, dto.shopId);
    const moldDeliveryShopId = dto.moldDeliveryShopId ?? shopId;
    await this.assertDeliveryLocation(moldDeliveryShopId);

    const order = await this.prisma.order.create({
      data: {
        orderNumber: this.generateOrderNumber(),
        shopId,
        moldDeliveryShopId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        deliveryDatetime: new Date(dto.deliveryDatetime),
        totalPrice: dto.totalPrice,
        depositAmount: dto.depositAmount,
        paymentStatus: dto.paymentStatus,
        status: OrderStatus.New,
        isUrgent: dto.isUrgent,
        notes: dto.notes,
        createdById: actor.sub,
        items: {
          create: dto.items.map((item) => ({
            ...this.toOrderItemData(item),
          })),
        },
      },
      include: {
        items: true,
        shop: true,
        moldDeliveryShop: true,
      },
    });

    await this.prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        newStatus: OrderStatus.New,
        changedById: actor.sub,
        note: "Order created",
      },
    });

    await this.auditService.log({
      actorId: actor.sub,
      action: "ORDER_CREATED",
      entity: "Order",
      entityId: order.id,
      details: { status: order.status },
    });

    return order;
  }

  async findAll(query: OrdersQueryDto, actor: RequestActor) {
    const where: Prisma.OrderWhereInput = {};

    if (query.shopId) {
      where.shopId = query.shopId;
    }

    if (query.status) {
      where.status = query.status as OrderStatus;
    }

    if (query.isUrgent !== undefined) {
      where.isUrgent = query.isUrgent === "true";
    }

    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: "insensitive" } },
        { customerName: { contains: query.search, mode: "insensitive" } },
        { customerPhone: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.date) {
      const start = new Date(query.date);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      where.deliveryDatetime = {
        gte: start,
        lt: end,
      };
    }

    if (this.isShopScopedRole(actor.role)) {
      where.shopId = actor.shopId ?? undefined;
    }

    return this.prisma.order.findMany({
      where,
      include: orderResponseInclude,
      orderBy: [{ isUrgent: "desc" }, { deliveryDatetime: "asc" }],
    });
  }

  async findOne(id: string, actor: RequestActor) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        shop: true,
        moldDeliveryShop: true,
        statusHistory: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    this.assertCanAccessOrder(order.shopId, actor);
    return order;
  }

  async update(id: string, dto: UpdateOrderDto, actor: RequestActor) {
    const existing = await this.prisma.order.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException("Order not found");
    }

    this.assertCanAccessOrder(existing.shopId, actor);

    if (!editableStatuses.includes(existing.status)) {
      throw new BadRequestException(
        "Cannot edit an order after production has started",
      );
    }

    if (dto.totalPrice !== undefined || dto.depositAmount !== undefined) {
      this.assertDeposit(
        dto.depositAmount ?? existing.depositAmount,
        dto.totalPrice ?? existing.totalPrice,
      );
    }

    const nextShopId =
      dto.shopId !== undefined
        ? this.resolveWritableShopId(actor, dto.shopId)
        : undefined;

    if (dto.moldDeliveryShopId !== undefined) {
      await this.assertDeliveryLocation(dto.moldDeliveryShopId);
    }

    const order = await this.prisma.order.update({
      where: { id },
      data: {
        shopId: nextShopId,
        moldDeliveryShopId: dto.moldDeliveryShopId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        deliveryDatetime: dto.deliveryDatetime
          ? new Date(dto.deliveryDatetime)
          : undefined,
        totalPrice: dto.totalPrice,
        depositAmount: dto.depositAmount,
        paymentStatus: dto.paymentStatus,
        isUrgent: dto.isUrgent,
        notes: dto.notes,
        items:
          dto.items !== undefined
            ? {
                deleteMany: {},
                create: dto.items.map((item) => this.toOrderItemData(item)),
              }
            : undefined,
      },
      include: orderResponseInclude,
    });

    await this.recordStatusHistory({
      orderId: id,
      previousStatus: existing.status,
      newStatus: existing.status,
      changedById: actor.sub,
      note: "Order details updated",
    });

    await this.auditService.log({
      actorId: actor.sub,
      action: "ORDER_UPDATED",
      entity: "Order",
      entityId: id,
      details: dto as unknown as Record<string, unknown>,
    });

    return order;
  }

  async submit(id: string, actor: RequestActor) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { shop: true, moldDeliveryShop: true, items: true },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    this.assertCanAccessOrder(order.shopId, actor);
    return order;
  }

  async changeStatus(
    id: string,
    status: OrderStatus,
    actor: RequestActor,
    note?: string,
  ) {
    const existing = await this.prisma.order.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException("Order not found");
    }

    this.assertCanAccessOrder(existing.shopId, actor);

    if (existing.status === status) {
      return this.findOrderResponse(id);
    }

    const allowedTransitions = statusTransitions[existing.status] ?? [];
    if (!allowedTransitions.includes(status)) {
      throw new BadRequestException(
        `Invalid status transition: ${existing.status} -> ${status}`,
      );
    }

    const statusData =
      status === OrderStatus.Delivered
        ? { status, deliveredAt: new Date() }
        : { status };

    const updated = await this.prisma.order.update({
      where: { id },
      data: statusData,
      include: orderResponseInclude,
    });

    await this.recordStatusHistory({
      orderId: id,
      previousStatus: existing.status,
      newStatus: status,
      changedById: actor.sub,
      note,
    });

    await this.auditService.log({
      actorId: actor.sub,
      action: "ORDER_STATUS_CHANGED",
      entity: "Order",
      entityId: id,
      details: {
        previousStatus: existing.status,
        newStatus: status,
        note,
      },
    });

    return updated;
  }

  async confirmDelivery(id: string, actor: RequestActor) {
    return this.changeStatus(
      id,
      OrderStatus.Delivered,
      actor,
      "Delivery confirmed",
    );
  }

  async cancel(id: string, actor: RequestActor) {
    return this.changeStatus(
      id,
      OrderStatus.Cancelled,
      actor,
      "Order cancelled",
    );
  }

  async purgeExpiredDeliveredOrders(referenceDate = new Date()) {
    const cutoff = new Date(referenceDate.getTime() - 5 * 24 * 60 * 60 * 1000);

    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.Delivered,
        deliveredAt: { lte: cutoff },
      },
      select: {
        id: true,
        orderNumber: true,
        deliveredAt: true,
      },
    });

    if (!expiredOrders.length) {
      return 0;
    }

    const deleteResult = await this.prisma.order.deleteMany({
      where: {
        id: { in: expiredOrders.map((order) => order.id) },
        status: OrderStatus.Delivered,
        deliveredAt: { lte: cutoff },
      },
    });

    await Promise.all(
      expiredOrders.map((order) =>
        this.auditService.log({
          action: "ORDER_AUTO_DELETED",
          entity: "Order",
          entityId: order.id,
          details: {
            orderNumber: order.orderNumber,
            deliveredAt: order.deliveredAt?.toISOString(),
            retentionDays: 5,
          },
        }),
      ),
    );

    return deleteResult.count;
  }

  private generateOrderNumber() {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate(),
    ).padStart(2, "0")}`;
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `SP-${datePart}-${randomPart}`;
  }

  private toOrderItemData(item: CreateOrderDto["items"][number]) {
    return {
      itemKind: item.itemKind,
      pieceType: item.pieceType,
      hasTopDecoration: item.hasTopDecoration,
      cakeType:
        item.cakeType ??
        (item.itemKind === "Pieces" ? CakeType.Uncovered : CakeType.Cake),
      layers: item.layers,
      shape: item.shape,
      moldFlavor: item.moldFlavor,
      moldInnerColor: item.moldInnerColor,
      moldLayerColors:
        item.moldInnerColor === MoldInnerColor.MIXED
          ? item.moldLayerColors
          : undefined,
      moldColor: item.moldColor,
      hasFillings: item.hasFillings,
      filling: item.filling,
      withFoam: item.withFoam,
      foamCount: item.withFoam ? item.foamCount : undefined,
      finishType: item.finishType,
      specialDetails: item.specialDetails,
      writingText: item.writingText,
      peopleCount: item.peopleCount,
      referenceImages: item.referenceImages ?? [],
    };
  }

  private assertDeposit(deposit: number, total: number) {
    if (deposit > total) {
      throw new BadRequestException("Deposit cannot exceed total price");
    }
  }

  private resolveWritableShopId(
    actor: RequestActor,
    requestedShopId?: string | null,
  ) {
    if (this.isShopScopedRole(actor.role)) {
      if (!actor.shopId) {
        throw new ForbiddenException("Your account is not linked to a shop");
      }

      if (requestedShopId && requestedShopId !== actor.shopId) {
        throw new ForbiddenException("Cannot create order for another shop");
      }

      return actor.shopId;
    }

    if (!requestedShopId) {
      throw new BadRequestException(
        "shopId is required for admin and factory users",
      );
    }

    return requestedShopId;
  }

  private assertCanAccessOrder(orderShopId: string, actor: RequestActor) {
    if (this.isShopScopedRole(actor.role) && actor.shopId !== orderShopId) {
      throw new ForbiddenException(
        "You can only access orders for your own shop",
      );
    }
  }

  private async assertDeliveryLocation(shopId: string) {
    if (!shopId?.trim()) {
      throw new BadRequestException("Delivery location is required");
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true },
    });

    if (!shop) {
      throw new NotFoundException("Delivery location not found");
    }
  }

  private isShopScopedRole(role: UserRole) {
    return role === UserRole.SHOP_MANAGER || role === UserRole.SHOP_EMPLOYEE;
  }

  private async findOrderResponse(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: orderResponseInclude,
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    return order;
  }

  private async recordStatusHistory(data: {
    orderId: string;
    previousStatus?: OrderStatus;
    newStatus: OrderStatus;
    changedById?: string;
    note?: string;
  }) {
    try {
      await this.prisma.orderStatusHistory.create({ data });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown status history error";
      this.logger.warn(
        `Order status history skipped for ${data.orderId}: ${message}`,
      );
    }
  }
}
