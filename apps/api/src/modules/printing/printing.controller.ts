import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser, AuthenticatedRequestUser } from '../../common/decorators/current-user.decorator';
import { CreatePrintJobDto } from './dto/create-print-job.dto';
import { PrintingService } from './printing.service';

@ApiTags('print')
@ApiBearerAuth()
@Controller('print')
export class PrintingController {
  constructor(private readonly printingService: PrintingService) {}

  @Get('printers')
  async listPrinters() {
    return this.printingService.listPrinters();
  }

  @Get('production-sheet/:orderId.pdf')
  async productionSheet(
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Res() response: Response,
  ) {
    const pdf = await this.printingService.generateProductionSheet(orderId);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', 'inline; filename="production-sheet.pdf"');
    response.send(pdf);
  }

  @Get('orders-by-branch.pdf')
  async ordersByBranch(
    @Query('date') date: string | undefined,
    @Query('search') search: string | undefined,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Res() response: Response,
  ) {
    const pdf = await this.printingService.generateOrdersByBranch({
      date,
      search,
      actor: user,
    });
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="orders-by-branch.pdf"',
    );
    response.send(pdf);
  }

  @Get('daily-essentials-by-branch.pdf')
  async dailyEssentialsByBranch(
    @Query('targetDate') targetDate: string | undefined,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Res() response: Response,
  ) {
    const pdf = await this.printingService.generateDailyEssentialsByBranch({
      targetDate,
      actor: user,
    });
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="daily-essentials-by-branch.pdf"',
    );
    response.send(pdf);
  }

  @Post('jobs')
  async createJob(
    @Body() dto: CreatePrintJobDto,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return this.printingService.createPrintJob({
      orderId: dto.orderId,
      printerId: dto.printerId,
      copies: dto.copies,
      requestedById: user.sub,
    });
  }
}
