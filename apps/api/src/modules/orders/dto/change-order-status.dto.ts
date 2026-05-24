import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@sugarprecision/shared-types';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ChangeOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}