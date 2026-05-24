import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AnalyticsScheduler {
  constructor(@InjectQueue('analytics') private readonly analyticsQueue: Queue) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async enqueueRefreshJob() {
    await this.analyticsQueue.add('refresh-metrics', {}, {
      removeOnComplete: 100,
      removeOnFail: 100,
    });
  }
}