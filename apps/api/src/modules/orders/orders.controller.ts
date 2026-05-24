import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@sugarprecision/shared-types';
import { CurrentUser, AuthenticatedRequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { OrdersQueryDto } from './dto/orders-query.dto';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER, UserRole.SHOP_EMPLOYEE)
  @Post()
  async create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return this.ordersService.create(dto, user as unknown as { sub: string; role: UserRole; shopId?: string | null });
  }

  @Get()
  async findAll(@Query() query: OrdersQueryDto, @CurrentUser() user: AuthenticatedRequestUser) {
    return this.ordersService.findAll(
      query,
      user as unknown as { sub: string; role: UserRole; shopId?: string | null },
    );
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return this.ordersService.findOne(
      id,
      user as unknown as { sub: string; role: UserRole; shopId?: string | null },
    );
  }

  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER, UserRole.SHOP_EMPLOYEE)
  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return this.ordersService.update(
      id,
      dto,
      user as unknown as { sub: string; role: UserRole; shopId?: string | null },
    );
  }

  @Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER, UserRole.SHOP_EMPLOYEE)
  @Post(':id/submit')
  async submit(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return this.ordersService.submit(
      id,
      user as unknown as { sub: string; role: UserRole; shopId?: string | null },
    );
  }

  @Roles(UserRole.ADMIN, UserRole.FACTORY_MANAGER)
  @Post(':id/status')
  async changeStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ChangeOrderStatusDto,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return this.ordersService.changeStatus(
      id,
      dto.status,
      user as unknown as { sub: string; role: UserRole; shopId?: string | null },
      dto.note,
    );
  }

  @Roles(UserRole.ADMIN, UserRole.FACTORY_MANAGER)
  @Post(':id/confirm-delivery')
  async confirmDelivery(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return this.ordersService.confirmDelivery(
      id,
      user as unknown as { sub: string; role: UserRole; shopId?: string | null },
    );
  }
}