import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UserRole } from '@sugarprecision/shared-types';
import PDFDocument from 'pdfkit';
import ipp from 'ipp';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedRequestUser } from '../../common/decorators/current-user.decorator';

const cairoRegular = require.resolve(
  '@expo-google-fonts/cairo/400Regular/Cairo_400Regular.ttf',
);
const cairoBold = require.resolve(
  '@expo-google-fonts/cairo/700Bold/Cairo_700Bold.ttf',
);

const categoryLabels: Record<string, string> = {
  Ready_Cake: 'كيك جاهز',
  Raw_Materials: 'مواد أولية',
  Pieces: 'قطع',
  Supplies: 'مستلزمات',
};

const itemKindLabels: Record<string, string> = {
  Mold: 'قالب',
  Pieces: 'قطع',
};

const flavorLabels: Record<string, string> = {
  White: 'أبيض',
  Black: 'أسود',
  Mixed: 'مشكل',
  Cream: 'كريمة',
  Chocolate: 'شوكولا',
  Harissa: 'هريسة',
};

const innerColorLabels: Record<string, string> = {
  White: 'أبيض',
  Black: 'أسود',
  Mixed: 'مشكل',
};

@Injectable()
export class PrintingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listPrinters() {
    return this.prisma.printer.findMany({ orderBy: { name: 'asc' } });
  }

  async generateProductionSheet(orderId: string): Promise<Buffer> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        shop: true,
        moldDeliveryShop: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk as Buffer));

    doc.fontSize(20).text('SugarPrecision - Production Sheet', { align: 'left' });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Order Number: ${order.orderNumber}`);
    doc.text(`Shop: ${order.shop.name}`);
    doc.text(`Delivery Location: ${order.moldDeliveryShop?.name ?? order.shop.name}`);
    doc.text(`Customer: ${order.customerName}`);
    doc.text(`Phone: ${order.customerPhone}`);
    doc.text(`Delivery: ${order.deliveryDatetime.toISOString()}`);
    doc.text(`Status: ${order.status}`);
    doc.text(`Urgent: ${order.isUrgent ? 'Yes' : 'No'}`);
    doc.moveDown();

    doc.fontSize(14).text('Items', { underline: true });
    doc.moveDown(0.5);

    order.items.forEach((item, index) => {
      doc.fontSize(11).text(`Item ${index + 1}:`);
      doc.text(`- Kind: ${item.itemKind}`);
      if (item.pieceType) {
        doc.text(`- Piece type: ${item.pieceType}`);
      }
      doc.text(`- Layers: ${item.layers}`);
      if (item.moldFlavor) {
        doc.text(`- Mold flavor: ${item.moldFlavor}`);
      }
      if (item.moldInnerColor) {
        doc.text(
          `- Mold inner color: ${item.moldInnerColor}${
            item.moldLayerColors?.trim()
              ? ` (${item.moldLayerColors.trim()})`
              : ''
          }`,
        );
      }
      if (item.moldColor) {
        doc.text(`- Mold external color: ${item.moldColor}`);
      }
      if (item.shape) {
        doc.text(`- Shape: ${item.shape}`);
      }
      doc.text(`- Fillings: ${item.hasFillings ? item.filling ?? 'Yes' : 'No'}`);
      doc.text(
        `- Foam: ${item.withFoam ? `Yes${item.foamCount ? ` (${item.foamCount})` : ''}` : 'No'}`,
      );
      doc.text(`- Finish: ${item.finishType}`);
      doc.text(`- Quantity/people: ${item.peopleCount}`);
      if (item.specialDetails) {
        doc.text(`- Notes: ${item.specialDetails}`);
      }
      doc.text(`- Writing: ${item.writingText?.trim() || 'None'}`);
      doc.moveDown(0.5);
    });

    doc.end();

    return await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async generateOrdersByBranch(params: {
    date?: string;
    search?: string;
    actor: AuthenticatedRequestUser;
  }): Promise<Buffer> {
    const where: Prisma.OrderWhereInput = {};
    this.applyShopScope(where, params.actor);

    const range = this.getDateRange(params.date);
    if (range) {
      where.deliveryDatetime = range;
    }

    if (params.search?.trim()) {
      where.OR = [
        { orderNumber: { contains: params.search.trim(), mode: 'insensitive' } },
        { customerName: { contains: params.search.trim(), mode: 'insensitive' } },
        { customerPhone: { contains: params.search.trim(), mode: 'insensitive' } },
      ];
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        shop: true,
        moldDeliveryShop: true,
        items: true,
      },
      orderBy: [
        { shop: { name: 'asc' } },
        { deliveryDatetime: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return this.buildArabicPdf((doc) => {
      this.writeHeading(doc, 'الطلبيات حسب الفروع');
      this.writeSubheading(
        doc,
        params.date ? `التاريخ: ${this.formatDate(params.date)}` : 'جميع التواريخ',
      );

      if (!orders.length) {
        this.writeBody(doc, 'لا توجد طلبيات للطباعة.');
        return;
      }

      const groups = this.groupBy(
        orders,
        (order) => order.shop?.name ?? 'فرع غير محدد',
      );

      groups.forEach((branchOrders, branchName) => {
        this.ensureSpace(doc, 110);
        this.writeSectionTitle(doc, branchName);

        branchOrders.forEach((order, index) => {
          this.ensureSpace(doc, 150);
          this.writeBody(
            doc,
            `${index + 1}. الطلب ${order.orderNumber} - ${order.customerName}`,
            true,
          );
          this.writeBody(doc, `الهاتف: ${order.customerPhone}`);
          this.writeBody(
            doc,
            `موعد التسليم: ${this.formatDateTime(order.deliveryDatetime)}`,
          );
          this.writeBody(
            doc,
            `مكان التسليم: ${order.moldDeliveryShop?.name ?? order.shop?.name ?? '-'}`,
          );
          this.writeBody(doc, `الأولوية: ${order.isUrgent ? 'عاجل' : 'عادي'}`);
          if (order.notes) {
            this.writeBody(doc, `ملاحظات الطلب: ${order.notes}`);
          }

          order.items.forEach((item, itemIndex) => {
            const itemDetails = [
              `${itemIndex + 1}) ${itemKindLabels[item.itemKind] ?? item.itemKind}`,
              item.moldFlavor
                ? `النوع: ${flavorLabels[item.moldFlavor] ?? item.moldFlavor}`
                : null,
              item.moldInnerColor
                ? `اللون الداخلي: ${
                    innerColorLabels[item.moldInnerColor] ?? item.moldInnerColor
                  }${
                    item.moldInnerColor === 'Mixed'
                      ? ` - ألوان الطبقات: ${
                          item.moldLayerColors?.trim() || 'غير محدد'
                        }`
                      : ''
                  }`
                : null,
              item.moldColor ? `اللون الخارجي: ${item.moldColor}` : null,
              `عدد الطوابق: ${item.layers}`,
              item.itemKind === 'Mold'
                ? `الفلين: ${
                    item.withFoam
                      ? `مع فلين${item.foamCount ? ` - العدد: ${item.foamCount}` : ''}`
                      : 'بدون فلين'
                  }`
                : null,
              `الكمية/الأشخاص: ${item.peopleCount}`,
              item.specialDetails ? `ملاحظات: ${item.specialDetails}` : null,
              item.itemKind === 'Mold'
                ? `الكتابة الخاصة بالقالب: ${item.writingText?.trim() || 'مافي كتابة'}`
                : null,
            ].filter(Boolean);
            this.writeBody(doc, itemDetails.join(' - '));
          });
          doc.moveDown(0.5);
        });
      });
    });
  }

  async generateDailyEssentialsByBranch(params: {
    targetDate?: string;
    actor: AuthenticatedRequestUser;
  }): Promise<Buffer> {
    const where: Prisma.DailyEssentialWhereInput = {};
    this.applyShopScope(where, params.actor);

    const range = this.getDateRange(params.targetDate);
    if (range) {
      where.targetDate = range;
    }

    const essentials = await this.prisma.dailyEssential.findMany({
      where,
      include: { shop: true },
      orderBy: [
        { shop: { name: 'asc' } },
        { targetDate: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return this.buildArabicPdf((doc) => {
      this.writeHeading(doc, 'التواصي اليومية حسب الفروع');
      this.writeSubheading(
        doc,
        params.targetDate
          ? `التاريخ: ${this.formatDate(params.targetDate)}`
          : 'جميع التواريخ',
      );

      if (!essentials.length) {
        this.writeBody(doc, 'لا توجد تواصي للطباعة.');
        return;
      }

      const groups = this.groupBy(
        essentials,
        (item) => item.shop?.name ?? 'فرع غير محدد',
      );

      groups.forEach((branchEssentials, branchName) => {
        this.ensureSpace(doc, 100);
        this.writeSectionTitle(doc, branchName);

        branchEssentials.forEach((item, index) => {
          this.ensureSpace(doc, 70);
          this.writeBody(
            doc,
            `${index + 1}. ${item.itemName} - الكمية: ${item.quantity}`,
            true,
          );
          this.writeBody(
            doc,
            `الفئة: ${categoryLabels[item.category] ?? item.category}`,
          );
          if (item.notes) {
            this.writeBody(doc, `ملاحظة: ${item.notes}`);
          }
          doc.moveDown(0.35);
        });
      });
    });
  }

  async createPrintJob(params: {
    orderId: string;
    printerId?: string;
    copies: number;
    requestedById?: string;
  }) {
    const order = await this.prisma.order.findUnique({ where: { id: params.orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    let printer = null;
    if (params.printerId) {
      printer = await this.prisma.printer.findUnique({ where: { id: params.printerId } });
      if (!printer || !printer.isActive) {
        throw new NotFoundException('Printer not available');
      }
    }

    const printJob = await this.prisma.printJob.create({
      data: {
        orderId: params.orderId,
        printerId: params.printerId,
        requestedById: params.requestedById,
      },
    });

    const pdf = await this.generateProductionSheet(params.orderId);

    if (printer) {
      try {
        await this.sendToPrinter(printer.ipAddress, printer.port, pdf, params.copies);

        await this.prisma.printJob.update({
          where: { id: printJob.id },
          data: {
            status: 'Sent',
            completedAt: new Date(),
          },
        });
      } catch (error) {
        await this.prisma.printJob.update({
          where: { id: printJob.id },
          data: {
            status: 'Failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown printer error',
            completedAt: new Date(),
          },
        });

        throw new BadRequestException('Failed to send to printer');
      }
    }

    await this.auditService.log({
      actorId: params.requestedById,
      action: 'PRINT_JOB_CREATED',
      entity: 'PrintJob',
      entityId: printJob.id,
      details: {
        orderId: params.orderId,
        printerId: params.printerId,
        copies: params.copies,
      },
    });

    return this.prisma.printJob.findUnique({ where: { id: printJob.id } });
  }

  private async sendToPrinter(
    ipAddress: string,
    port: number,
    pdf: Buffer,
    copies: number,
  ) {
    const printer = ipp.Printer(`http://${ipAddress}:${port}/ipp/print`);

    await new Promise<void>((resolve, reject) => {
      printer.execute(
        'Print-Job',
        {
          'operation-attributes-tag': {
            'requesting-user-name': 'SugarPrecision',
            'job-name': 'Production Sheet',
            'document-format': 'application/pdf',
            copies,
          },
          data: pdf,
        },
        (error: unknown) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        },
      );
    });
  }

  private buildArabicPdf(writeContent: (doc: PDFKit.PDFDocument) => void) {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.registerFont('Cairo', cairoRegular);
    doc.registerFont('CairoBold', cairoBold);
    doc.font('Cairo');
    writeContent(doc);
    doc.end();

    return new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
  }

  private writeHeading(doc: PDFKit.PDFDocument, text: string) {
    doc.font('CairoBold').fontSize(19).text(text, {
      align: 'right',
      features: ['rtla'],
    });
    doc.moveDown(0.3);
  }

  private writeSubheading(doc: PDFKit.PDFDocument, text: string) {
    doc.font('Cairo').fontSize(10).fillColor('#587083').text(text, {
      align: 'right',
      features: ['rtla'],
    });
    doc.fillColor('#102436').moveDown();
  }

  private writeSectionTitle(doc: PDFKit.PDFDocument, text: string) {
    doc.font('CairoBold').fontSize(14).fillColor('#0a6fb8').text(text, {
      align: 'right',
      features: ['rtla'],
    });
    doc.fillColor('#102436').moveDown(0.35);
  }

  private writeBody(doc: PDFKit.PDFDocument, text: string, bold = false) {
    doc.font(bold ? 'CairoBold' : 'Cairo').fontSize(10.5).text(text, {
      align: 'right',
      features: ['rtla'],
      lineGap: 2,
    });
  }

  private ensureSpace(doc: PDFKit.PDFDocument, minimumHeight: number) {
    if (doc.y + minimumHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }
  }

  private getDateRange(value?: string) {
    if (!value) {
      return undefined;
    }

    const start = new Date(value);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Invalid date');
    }

    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { gte: start, lt: end };
  }

  private applyShopScope(
    where: Prisma.OrderWhereInput | Prisma.DailyEssentialWhereInput,
    actor: AuthenticatedRequestUser,
  ) {
    if (
      actor.role === UserRole.SHOP_MANAGER ||
      actor.role === UserRole.SHOP_EMPLOYEE
    ) {
      if (!actor.shopId) {
        throw new ForbiddenException('Your account is not linked to a shop');
      }
      where.shopId = actor.shopId;
    }
  }

  private groupBy<T>(items: T[], getKey: (item: T) => string) {
    const groups = new Map<string, T[]>();
    items.forEach((item) => {
      const key = getKey(item);
      groups.set(key, [...(groups.get(key) ?? []), item]);
    });
    return groups;
  }

  private formatDate(value: string | Date) {
    return new Date(value).toLocaleDateString('ar-SY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Damascus',
    });
  }

  private formatDateTime(value: Date) {
    return value.toLocaleString('ar-SY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Damascus',
    });
  }
}
