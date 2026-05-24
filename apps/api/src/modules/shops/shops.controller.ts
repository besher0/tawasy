import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ShopsService } from './shops.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@sugarprecision/shared-types';
import { CreateShopDto } from './dto/create-shop.dto';

@ApiTags('shops')
@ApiBearerAuth()
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  async findAll() {
    return this.shopsService.findAll();
  }

  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() dto: CreateShopDto) {
    return this.shopsService.create(dto);
  }
}