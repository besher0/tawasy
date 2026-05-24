import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@sugarprecision/shared-types';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedRequestUser } from '../../common/decorators/current-user.decorator';
import { DailyEssentialsService } from './daily-essentials.service';
import { CreateDailyEssentialDto } from './dto/create-daily-essential.dto';
import { UpdateDailyEssentialDto } from './dto/update-daily-essential.dto';
import { DailyEssentialsQueryDto } from './dto/daily-essentials-query.dto';

@ApiTags('daily-essentials')
@ApiBearerAuth()
@Controller('daily-essentials')
export class DailyEssentialsController {
  constructor(private readonly dailyEssentialsService: DailyEssentialsService) {}

  @Roles(UserRole.ADMIN, UserRole.FACTORY_MANAGER, UserRole.SHOP_MANAGER, UserRole.SHOP_EMPLOYEE)
  @Post()
  async create(
    @Body() dto: CreateDailyEssentialDto,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return this.dailyEssentialsService.create(dto, {
      sub: user.sub,
      role: user.role as never,
      shopId: user.shopId,
    });
  }

  @Get()
  async findAll(@Query() query: DailyEssentialsQueryDto, @CurrentUser() user: AuthenticatedRequestUser) {
    return this.dailyEssentialsService.findAll(query, {
      sub: user.sub,
      role: user.role as never,
      shopId: user.shopId,
    });
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDailyEssentialDto,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return this.dailyEssentialsService.update(id, dto, {
      sub: user.sub,
      role: user.role as never,
      shopId: user.shopId,
    });
  }

  @Delete(':id')
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return this.dailyEssentialsService.remove(id, {
      sub: user.sub,
      role: user.role as never,
      shopId: user.shopId,
    });
  }
}