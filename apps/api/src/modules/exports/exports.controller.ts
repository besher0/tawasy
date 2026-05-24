import { Controller, Get, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ExportsService } from './exports.service';

@ApiTags('exports')
@ApiBearerAuth()
@Controller('exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('orders.xlsx')
  async exportOrders(@Res() response: Response) {
    const file = await this.exportsService.generateOrdersExcel();
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader('Content-Disposition', 'attachment; filename="orders.xlsx"');
    response.send(file);
  }

  @Get('analytics.xlsx')
  async exportAnalytics(@Res() response: Response) {
    const file = await this.exportsService.generateAnalyticsExcel();
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader('Content-Disposition', 'attachment; filename="analytics.xlsx"');
    response.send(file);
  }
}