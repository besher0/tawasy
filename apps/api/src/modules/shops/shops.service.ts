import { Injectable } from '@nestjs/common';
import { ShopType as PrismaShopType } from '@prisma/client';
import { ShopType } from '@sugarprecision/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: { type?: ShopType } = {}) {
    return this.prisma.shop.findMany({
      where: {
        type: filters.type as PrismaShopType | undefined,
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateShopDto) {
    return this.prisma.shop.create({
      data: {
        ...dto,
        type: dto.type as PrismaShopType | undefined,
      },
    });
  }
}
