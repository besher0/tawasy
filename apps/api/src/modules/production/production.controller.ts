import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedRequestUser } from '../../common/decorators/current-user.decorator';
import { ProductionService } from './production.service';
import { KanbanQueryDto } from './kanban-query.dto';

@ApiTags('production')
@ApiBearerAuth()
@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get('kanban')
  async getKanban(
    @Query() query: KanbanQueryDto,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return this.productionService.getKanban(query, {
      sub: user.sub,
      role: user.role as never,
      shopId: user.shopId,
    });
  }
}