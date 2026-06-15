import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersCleanupScheduler } from './orders-cleanup.scheduler';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersCleanupScheduler],
  exports: [OrdersService],
})
export class OrdersModule {}
