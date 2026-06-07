import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@sugarprecision/shared-types';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @ApiPropertyOptional({ description: 'Required only for admin/factory users. Shop users use their account shop automatically.' })
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional({ description: 'Delivery shop or factory location.' })
  @IsOptional()
  @IsString()
  moldDeliveryShopId?: string;

  @ApiProperty()
  @IsString()
  customerName!: string;

  @ApiProperty()
  @IsString()
  customerPhone!: string;

  @ApiProperty()
  @IsDateString()
  deliveryDatetime!: string;

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  totalPrice!: number;

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  depositAmount!: number;

  @ApiProperty({ enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  paymentStatus!: PaymentStatus;

  @ApiProperty({ default: false })
  @IsBoolean()
  isUrgent!: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
