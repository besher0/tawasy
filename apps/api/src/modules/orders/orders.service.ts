import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, OrderStatus, ShopType } from '@prisma/client';
import { UserRole } from '@sugarprecision/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersQueryDto } from './dto/orders-query.dto';

interface RequestActor {
  sub: string;
  role: UserRole;
  shopId?: string | null;
}

const editableStatuses: OrderStatus[] = [OrderStatus.New, OrderStatus.Reviewing];
const statusTransitions: Record<OrderStatus, OrderStatus[]> = {
  New: [OrderStatus.Reviewing, OrderStatus.Cancelled],
  Reviewing: [OrderStatus.In_Production, OrderStatus.Cancelled],
  In_Production: [OrderStatus.Ready, OrderStatus.Cancelled],
  Ready: [OrderStatus.Delivered],
  Delivered: [],
  Cancelled: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateOrderDto, actor: RequestActor) {
    this.assertDeposit(dto.depositAmount, dto.totalPrice);
    this.assertCanWriteShop(actor, dto.shopId);
    const moldDeliveryShopId = dto.moldDeliveryShopId ?? dto.shopId;
    await this.assertMoldDeliveryShop(moldDeliveryShopId);

    const order = await this.prisma.order.create({
      data: {
        orderNumber: this.generateOrderNumber(),
        shopId: dto.shopId,
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
            cakeType: item.cakeType,
            layers: item.layers,
            shape: item.shape,
            filling: item.filling,
            specialDetails: item.specialDetails,
            peopleCount: item.peopleCount,
            referenceImages: item.referenceImages ?? [],
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
        note: 'Order created',
      },
    });

    await this.auditService.log({
      actorId: actor.sub,
      action: 'ORDER_CREATED',
      entity: 'Order',
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
      where.isUrgent = query.isUrgent === 'true';
    }

    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { customerName: { contains: query.search, mode: 'insensitive' } },
        { customerPhone: { contains: query.search, mode: 'insensitive' } },
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
      include: {
        shop: true,
        moldDeliveryShop: true,
        items: true,
      },
      orderBy: [{ isUrgent: 'desc' }, { deliveryDatetime: 'asc' }],
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
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.assertCanAccessOrder(order.shopId, actor);
    return order;
  }

  async update(id: string, dto: UpdateOrderDto, actor: RequestActor) {
    const existing = await this.prisma.order.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    this.assertCanAccessOrder(existing.shopId, actor);

    if (!editableStatuses.includes(existing.status)) {
      throw new BadRequestException(
        'Cannot edit an order after production has started',
      );
    }

    if (dto.totalPrice !== undefined || dto.depositAmount !== undefined) {
      this.assertDeposit(
        dto.depositAmount ?? existing.depositAmount,
        dto.totalPrice ?? existing.totalPrice,
      );
    }

    if (dto.moldDeliveryShopId !== undefined) {
      await this.assertMoldDeliveryShop(dto.moldDeliveryShopId);
    }

    const order = await this.prisma.order.update({
      where: { id },
      data: {
        shopId: dto.shopId,
        moldDeliveryShopId: dto.moldDeliveryShopId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        deliveryDatetime: dto.deliveryDatetime ? new Date(dto.deliveryDatetime) : undefined,
        totalPrice: dto.totalPrice,
        depositAmount: dto.depositAmount,
        paymentStatus: dto.paymentStatus,
        isUrgent: dto.isUrgent,
        notes: dto.notes,
      },
      include: { items: true, shop: true, moldDeliveryShop: true },
    });

    await this.auditService.log({
      actorId: actor.sub,
      action: 'ORDER_UPDATED',
      entity: 'Order',
      entityId: id,
      details: dto as unknown as Record<string, unknown>,
    });

    return order;
  }

  async submit(id: string, actor: RequestActor) {
    return this.changeStatus(id, OrderStatus.Reviewing, actor, 'Submitted to factory');
  }

  async changeStatus(id: string, status: OrderStatus, actor: RequestActor, note?: string) {
    const existing = await this.prisma.order.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    this.assertCanAccessOrder(existing.shopId, actor);

    const allowedTransitions = statusTransitions[existing.status] ?? [];
    if (!allowedTransitions.includes(status)) {
      throw new BadRequestException(
        `Invalid status transition: ${existing.status} -> ${status}`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: { shop: true, moldDeliveryShop: true, items: true },
    });

    await this.prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        previousStatus: existing.status,
        newStatus: status,
        changedById: actor.sub,
        note,
      },
    });

    await this.auditService.log({
      actorId: actor.sub,
      action: 'ORDER_STATUS_CHANGED',
      entity: 'Order',
      entityId: id,
      details: {
        previousStatus: existing.status,
        newStatus: status,
        note,
      },
    });

    const usersToNotify = await this.prisma.user.findMany({
      where: {
        OR: [
          { shopId: existing.shopId },
          { role: UserRole.ADMIN as never },
          { role: UserRole.FACTORY_MANAGER as never },
        ],
      },
      select: { id: true },
    });

    await Promise.all(
      usersToNotify.map((user) =>
        this.notificationsService.pushInternalNotification({
          userId: user.id,
          type: 'OrderStatus',
          title: `Order ${updated.orderNumber} status updated`,
          body: `Status changed from ${existing.status} to ${status}.`,
          payload: { orderId: updated.id, status },
        }),
      ),
    );

    return updated;
  }

  async confirmDelivery(id: string, actor: RequestActor) {
    return this.changeStatus(id, OrderStatus.Delivered, actor, 'Delivery confirmed');
  }

  private generateOrderNumber() {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate(),
    ).padStart(2, '0')}`;
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `SP-${datePart}-${randomPart}`;
  }

  private assertDeposit(deposit: number, total: number) {
    if (deposit > total) {
      throw new BadRequestException('Deposit cannot exceed total price');
    }
  }

  private assertCanWriteShop(actor: RequestActor, shopId: string) {
    if (this.isShopScopedRole(actor.role) && actor.shopId !== shopId) {
      throw new ForbiddenException('Cannot create order for another shop');
    }
  }

  private assertCanAccessOrder(orderShopId: string, actor: RequestActor) {
    if (this.isShopScopedRole(actor.role) && actor.shopId !== orderShopId) {
      throw new ForbiddenException('You can only access orders for your own shop');
    }
  }

  private async assertMoldDeliveryShop(shopId: string) {
    if (!shopId?.trim()) {
      throw new BadRequestException('Mold delivery branch is required');
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, type: true },
    });

    if (!shop) {
      throw new NotFoundException('Mold delivery branch not found');
    }

    if (shop.type !== ShopType.Branch) {
      throw new BadRequestException('Mold delivery location must be a branch');
    }
  }

  private isShopScopedRole(role: UserRole) {
    return role === UserRole.SHOP_MANAGER || role === UserRole.SHOP_EMPLOYEE;
  }
}
