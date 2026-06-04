import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async generateOrdersExcel(): Promise<Buffer> {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Orders');

    sheet.columns = [
      { header: 'Order Number', key: 'orderNumber', width: 20 },
      { header: 'Shop', key: 'shopName', width: 24 },
      { header: 'Mold Delivery Branch', key: 'moldDeliveryShopName', width: 26 },
      { header: 'Customer Name', key: 'customerName', width: 24 },
      { header: 'Phone', key: 'customerPhone', width: 18 },
      { header: 'Delivery Date', key: 'deliveryDatetime', width: 22 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Payment Status', key: 'paymentStatus', width: 18 },
      { header: 'Urgent', key: 'isUrgent', width: 10 },
      { header: 'Total Price', key: 'totalPrice', width: 14 },
      { header: 'Deposit', key: 'depositAmount', width: 14 },
    ];

    const orders = await this.prisma.order.findMany({
      include: { shop: true, moldDeliveryShop: true },
      orderBy: { createdAt: 'desc' },
    });

    for (const order of orders) {
      sheet.addRow({
        orderNumber: order.orderNumber,
        shopName: order.shop.name,
        moldDeliveryShopName: order.moldDeliveryShop?.name ?? order.shop.name,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        deliveryDatetime: order.deliveryDatetime.toISOString(),
        status: order.status,
        paymentStatus: order.paymentStatus,
        isUrgent: order.isUrgent ? 'Yes' : 'No',
        totalPrice: order.totalPrice,
        depositAmount: order.depositAmount,
      });
    }

    sheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateAnalyticsExcel(): Promise<Buffer> {
    const workbook = new Workbook();

    const overviewSheet = workbook.addWorksheet('Overview');
    const overview = await this.analyticsService.getOverview();

    overviewSheet.addRow(['Metric', 'Value']);
    overviewSheet.addRow(['Total Sales', overview.totalSales]);
    overviewSheet.addRow(['Total Orders', overview.totalOrders]);
    overviewSheet.addRow(['Completion Rate', overview.completionRate]);
    overviewSheet.addRow(['Average Order Value', overview.avgOrderValue]);
    overviewSheet.addRow(['Ready Count', overview.readyCount]);
    overviewSheet.addRow(['Delayed Count', overview.delayedCount]);
    overviewSheet.getRow(1).font = { bold: true };

    const trendSheet = workbook.addWorksheet('Orders Trend');
    trendSheet.addRow(['Date', 'Orders']);
    const trend = await this.analyticsService.getOrdersTrend(7);
    for (const point of trend.points as Array<{ date: string; count: number }>) {
      trendSheet.addRow([point.date, point.count]);
    }
    trendSheet.getRow(1).font = { bold: true };

    const topProductsSheet = workbook.addWorksheet('Top Products');
    topProductsSheet.addRow(['Product', 'Quantity', 'Revenue']);
    const topProducts = await this.analyticsService.getTopProducts(10);
    for (const product of topProducts.items as Array<{ label: string; quantity: number; revenue: number }>) {
      topProductsSheet.addRow([product.label, product.quantity, product.revenue]);
    }
    topProductsSheet.getRow(1).font = { bold: true };

    const topShopsSheet = workbook.addWorksheet('Top Shops');
    topShopsSheet.addRow(['Shop', 'Orders', 'Total Sales']);
    const topShops = await this.analyticsService.getTopShops(10);
    for (const shop of topShops.items as Array<{ shopName: string; ordersCount: number; totalSales: number }>) {
      topShopsSheet.addRow([shop.shopName, shop.ordersCount, shop.totalSales]);
    }
    topShopsSheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
