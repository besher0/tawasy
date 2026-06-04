import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface AuditLogInput {
  actorId?: string;
  action: string;
  entity: string;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          actorId: input.actorId,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
          details: input.details as Prisma.InputJsonValue | undefined,
          ipAddress: input.ipAddress,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown audit error';
      this.logger.warn(`Audit log skipped: ${input.action} ${input.entity}:${input.entityId}. ${message}`);
      return null;
    }
  }
}
