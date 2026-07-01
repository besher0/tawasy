import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KanbanQueryDto } from './kanban-query.dto';

interface RequestActor {
  sub: string;
  role: UserRole;
  shopId?: string | null;
}

function getLocalDayRange(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const start = new Date(year, month - 1, day);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return { start, end };
}

@Injectable()
export class ProductionService {
  constructor(private readonly prisma: PrismaService) {}

  async getKanban(query: KanbanQueryDto, actor: RequestActor) {
    const where: Prisma.OrderWhereInput = {};

    if (query.shopId) {
      where.shopId = query.shopId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.urgent !== undefined) {
      where.isUrgent = query.urgent === 'true';
    }

    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { customerName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.date) {
      const { start, end } = getLocalDayRange(query.date);
      where.deliveryDatetime = { gte: start, lt: end };
    }

    if (this.isShopScopedRole(actor.role)) {
      if (!actor.shopId) {
        throw new ForbiddenException('Shop context missing');
      }
      where.shopId = actor.shopId;
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        shop: true,
        moldDeliveryShop: true,
        items: true,
      },
      orderBy: [{ isUrgent: 'desc' }, { deliveryDatetime: 'asc' }],
    });

    const columns = {
      New: orders.filter((order) => order.status === 'New'),
      Reviewing: orders.filter((order) => order.status === 'Reviewing'),
      In_Production: orders.filter((order) => order.status === 'In_Production'),
      Ready: orders.filter((order) => order.status === 'Ready'),
      Delivered: orders.filter((order) => order.status === 'Delivered'),
      Cancelled: orders.filter((order) => order.status === 'Cancelled'),
    };

    return {
      filters: query,
      counts: Object.fromEntries(
        Object.entries(columns).map(([key, value]) => [key, value.length]),
      ),
      columns,
    };
  }

  private isShopScopedRole(role: UserRole) {
    return role === UserRole.ShopEmployee || role === UserRole.ShopManager;
  }
}
