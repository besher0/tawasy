import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@sugarprecision/shared-types';
import { IsBooleanString, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class OrdersQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBooleanString()
  isUrgent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'ISO date only' })
  @IsOptional()
  @IsDateString()
  date?: string;
}
