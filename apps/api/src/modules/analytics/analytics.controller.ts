import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@sugarprecision/shared-types';
import {
  CurrentUser,
  AuthenticatedRequestUser,
} from '../../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRangeDto } from './dto/analytics-range.dto';
import { AnalyticsLimitDto } from './dto/analytics-limit.dto';
import { DeliveryTotalsQueryDto } from './dto/delivery-totals-query.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async overview() {
    return this.analyticsService.getOverview();
  }

  @Get('orders-trend')
  async ordersTrend(@Query() query: AnalyticsRangeDto) {
    return this.analyticsService.getOrdersTrend(query.days ?? 7);
  }

  @Get('top-products')
  async topProducts(@Query() query: AnalyticsLimitDto) {
    return this.analyticsService.getTopProducts(query.limit ?? 10);
  }

  @Get('top-shops')
  async topShops(@Query() query: AnalyticsLimitDto) {
    return this.analyticsService.getTopShops(query.limit ?? 10);
  }

  @Get('delivery-totals')
  async deliveryTotals(
    @Query() query: DeliveryTotalsQueryDto,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return this.analyticsService.getDeliveryTotals(
      query,
      user as unknown as {
        sub: string;
        role: UserRole;
        shopId?: string | null;
      },
    );
  }
}
