import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsCacheService } from './analytics-cache.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AnalyticsCacheService,
  ) {}

  async getOverview() {
    const cacheKey = 'analytics:overview';
    const cached = await this.cache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const [todayOrders, allOrders] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          createdAt: { gte: startOfDay },
        },
      }),
      this.prisma.order.findMany(),
    ]);

    const totalSales = allOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    const totalOrders = allOrders.length;
    const delivered = allOrders.filter((order) => order.status === 'Delivered').length;
    const completionRate = totalOrders === 0 ? 0 : (delivered / totalOrders) * 100;
    const avgOrderValue = totalOrders === 0 ? 0 : totalSales / totalOrders;

    const readyCount = todayOrders.filter((order) => order.status === 'Ready').length;
    const delayedCount = todayOrders.filter(
      (order) =>
        order.deliveryDatetime < now &&
        !['Delivered', 'Cancelled'].includes(order.status),
    ).length;

    const result = {
      totalSales,
      totalOrders,
      completionRate,
      avgOrderValue,
      readyCount,
      delayedCount,
      generatedAt: now.toISOString(),
    };

    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async getOrdersTrend(days = 7) {
    const cacheKey = `analytics:orders-trend:${days}`;
    const cached = await this.cache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const buckets = new Map<string, number>();
    for (let i = 0; i < days; i += 1) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      const key = day.toISOString().slice(0, 10);
      buckets.set(key, 0);
    }

    for (const order of orders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }

    const result = {
      days,
      points: [...buckets.entries()].map(([date, count]) => ({ date, count })),
      generatedAt: new Date().toISOString(),
    };

    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async getTopProducts(limit = 10) {
    const cacheKey = `analytics:top-products:${limit}`;
    const cached = await this.cache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    const items = await this.prisma.orderItem.findMany({
      include: {
        order: {
          select: {
            totalPrice: true,
            status: true,
          },
        },
      },
    });

    const grouped = new Map<string, { label: string; quantity: number; revenue: number }>();

    for (const item of items) {
      const label = `${item.cakeType} - ${item.filling}`;
      const existing = grouped.get(label) ?? { label, quantity: 0, revenue: 0 };
      existing.quantity += 1;
      existing.revenue += item.order.totalPrice;
      grouped.set(label, existing);
    }

    const result = {
      items: [...grouped.values()]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, limit),
      generatedAt: new Date().toISOString(),
    };

    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async getTopShops(limit = 10) {
    const cacheKey = `analytics:top-shops:${limit}`;
    const cached = await this.cache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    const grouped = await this.prisma.order.groupBy({
      by: ['shopId'],
      _count: {
        _all: true,
      },
      _sum: {
        totalPrice: true,
      },
      orderBy: {
        _count: {
          shopId: 'desc',
        },
      },
      take: limit,
    });

    const shops = await this.prisma.shop.findMany({
      where: {
        id: {
          in: grouped.map((row) => row.shopId),
        },
      },
    });

    const shopMap = new Map(shops.map((shop) => [shop.id, shop]));

    const result = {
      items: grouped.map((row) => ({
        shopId: row.shopId,
        shopName: shopMap.get(row.shopId)?.name ?? 'Unknown',
        ordersCount: row._count._all,
        totalSales: row._sum.totalPrice ?? 0,
      })),
      generatedAt: new Date().toISOString(),
    };

    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async refreshSnapshots() {
    const [overview, trend, products, shops] = await Promise.all([
      this.getOverview(),
      this.getOrdersTrend(7),
      this.getTopProducts(10),
      this.getTopShops(10),
    ]);

    await this.prisma.analyticsSnapshot.createMany({
      data: [
        { key: 'overview', payload: overview as never },
        { key: 'orders-trend-7', payload: trend as never },
        { key: 'top-products', payload: products as never },
        { key: 'top-shops', payload: shops as never },
      ],
    });

    return { overview, trend, products, shops };
  }
}