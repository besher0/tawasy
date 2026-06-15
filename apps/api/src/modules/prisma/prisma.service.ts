import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { neon, types } from '@neondatabase/serverless';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';

const preserveDatabaseValue = (value: string) => value;

function createNeonAdapter(databaseUrl: string) {
  // Prisma's Neon HTTP adapter expects date-like values as PostgreSQL strings.
  // Neon's default parsers return Date objects, which Prisma receives as {}.
  types.setTypeParser(types.builtins.DATE, preserveDatabaseValue);
  types.setTypeParser(types.builtins.TIME, preserveDatabaseValue);
  types.setTypeParser(types.builtins.TIMETZ, preserveDatabaseValue);
  types.setTypeParser(types.builtins.TIMESTAMP, preserveDatabaseValue);
  types.setTypeParser(types.builtins.TIMESTAMPTZ, preserveDatabaseValue);

  return new PrismaNeonHTTP(neon(databaseUrl, { types }));
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    const adapter = databaseUrl?.includes('.neon.tech')
      ? createNeonAdapter(databaseUrl)
      : undefined;

    super(adapter ? { adapter } : undefined);
  }

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
