import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty()
  @IsString()
  shopId!: string;

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
