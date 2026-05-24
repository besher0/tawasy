import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateDailyEssentialDto } from './dto/create-daily-essential.dto';
import { UpdateDailyEssentialDto } from './dto/update-daily-essential.dto';
import { DailyEssentialsQueryDto } from './dto/daily-essentials-query.dto';

interface RequestActor {
  sub: string;
  role: UserRole;
  shopId?: string | null;
}

@Injectable()
export class DailyEssentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateDailyEssentialDto, actor: RequestActor) {
    this.assertCanWriteShop(actor, dto.shopId);

    const record = await this.prisma.dailyEssential.create({
      data: {
        ...dto,
        targetDate: new Date(dto.targetDate),
      },
    });

    await this.auditService.log({
      actorId: actor.sub,
      action: 'DAILY_ESSENTIAL_CREATED',
      entity: 'DailyEssential',
      entityId: record.id,
      details: dto as unknown as Record<string, unknown>,
    });

    return record;
  }

  async findAll(query: DailyEssentialsQueryDto, actor: RequestActor) {
    const where: Prisma.DailyEssentialWhereInput = {};

    if (query.shopId) where.shopId = query.shopId;
    if (query.category) where.category = query.category as never;
    if (query.status) where.status = query.status as never;

    if (query.targetDate) {
      const start = new Date(query.targetDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      where.targetDate = { gte: start, lt: end };
    }

    if (this.isShopScopedRole(actor.role)) {
      where.shopId = actor.shopId ?? undefined;
    }

    return this.prisma.dailyEssential.findMany({
      where,
      include: { shop: true },
      orderBy: [{ targetDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async update(id: string, dto: UpdateDailyEssentialDto, actor: RequestActor) {
    const existing = await this.prisma.dailyEssential.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Daily essential entry not found');
    }

    this.assertCanWriteShop(actor, existing.shopId);

    const updated = await this.prisma.dailyEssential.update({
      where: { id },
      data: {
        ...dto,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
    });

    await this.auditService.log({
      actorId: actor.sub,
      action: 'DAILY_ESSENTIAL_UPDATED',
      entity: 'DailyEssential',
      entityId: id,
      details: dto as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async remove(id: string, actor: RequestActor) {
    const existing = await this.prisma.dailyEssential.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Daily essential entry not found');
    }

    this.assertCanWriteShop(actor, existing.shopId);

    await this.prisma.dailyEssential.delete({ where: { id } });

    await this.auditService.log({
      actorId: actor.sub,
      action: 'DAILY_ESSENTIAL_DELETED',
      entity: 'DailyEssential',
      entityId: id,
    });

    return { message: 'Deleted successfully' };
  }

  private assertCanWriteShop(actor: RequestActor, shopId: string) {
    if (this.isShopScopedRole(actor.role) && actor.shopId !== shopId) {
      throw new ForbiddenException('Cannot mutate records for another shop');
    }
  }

  private isShopScopedRole(role: UserRole) {
    return role === UserRole.ShopManager || role === UserRole.ShopEmployee;
  }
}