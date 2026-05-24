import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.shop.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateShopDto) {
    return this.prisma.shop.create({
      data: dto,
    });
  }
}