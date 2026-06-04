import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      if (process.env.REQUIRE_DB_ON_START === 'true') {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown database connection error';
      this.logger.warn(`Database is not reachable during startup. API will continue for local UI testing. ${message}`);
    }
  }
}
