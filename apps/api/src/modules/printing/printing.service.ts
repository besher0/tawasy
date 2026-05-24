import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import PDFDocument from 'pdfkit';
import ipp from 'ipp';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

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
      doc.text(`- Type: ${item.cakeType}`);
      doc.text(`- Layers: ${item.layers}`);
      doc.text(`- Shape: ${item.shape}`);
      doc.text(`- Filling: ${item.filling}`);
      doc.text(`- People: ${item.peopleCount}`);
      if (item.specialDetails) {
        doc.text(`- Notes: ${item.specialDetails}`);
      }
      doc.moveDown(0.5);
    });

    doc.end();

    return await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
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
}
