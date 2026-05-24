import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AnalyticsService } from './analytics.service';

@Processor('analytics')
export class AnalyticsProcessor extends WorkerHost {
  constructor(private readonly analyticsService: AnalyticsService) {
    super();
  }

  async process(job: Job) {
    if (job.name === 'refresh-metrics') {
      await this.analyticsService.refreshSnapshots();
    }
  }
}
