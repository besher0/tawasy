import { Module } from '@nestjs/common';
import { DailyEssentialsController } from './daily-essentials.controller';
import { DailyEssentialsService } from './daily-essentials.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [DailyEssentialsController],
  providers: [DailyEssentialsService],
  exports: [DailyEssentialsService],
})
export class DailyEssentialsModule {}
