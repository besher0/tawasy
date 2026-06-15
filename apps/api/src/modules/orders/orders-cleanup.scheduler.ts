import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service';

@Injectable()
export class OrdersCleanupScheduler {
  private readonly logger = new Logger(OrdersCleanupScheduler.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async removeExpiredDeliveredOrders() {
    try {
      const deletedCount =
        await this.ordersService.purgeExpiredDeliveredOrders();

      if (deletedCount > 0) {
        this.logger.log(
          `Deleted ${deletedCount} delivered order(s) after the 5-day retention period`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown cleanup error';
      this.logger.error(`Delivered order cleanup failed: ${message}`);
    }
  }
}
