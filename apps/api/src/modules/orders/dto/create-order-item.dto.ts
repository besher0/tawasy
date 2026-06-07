import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CakeFinish,
  CakeShape,
  CakeType,
  MoldFlavor,
  OrderItemKind,
} from '@sugarprecision/shared-types';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({ enum: OrderItemKind })
  @IsEnum(OrderItemKind)
  itemKind!: OrderItemKind;

  @ApiPropertyOptional()
  @ValidateIf((item: CreateOrderItemDto) => item.itemKind === OrderItemKind.PIECES)
  @IsString()
  pieceType?: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  hasTopDecoration!: boolean;

  @ApiPropertyOptional({ enum: CakeType })
  @IsOptional()
  @IsEnum(CakeType)
  cakeType?: CakeType;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  layers!: number;

  @ApiPropertyOptional({ enum: CakeShape })
  @ValidateIf((item: CreateOrderItemDto) => item.itemKind === OrderItemKind.MOLD)
  @IsEnum(CakeShape)
  shape?: CakeShape;

  @ApiPropertyOptional({ enum: MoldFlavor })
  @ValidateIf((item: CreateOrderItemDto) => item.itemKind === OrderItemKind.MOLD)
  @IsEnum(MoldFlavor)
  moldFlavor?: MoldFlavor;

  @ApiProperty({ default: false })
  @IsBoolean()
  hasFillings!: boolean;

  @ApiPropertyOptional()
  @ValidateIf((item: CreateOrderItemDto) => item.hasFillings)
  @IsString()
  filling?: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  withFoam!: boolean;

  @ApiProperty({ enum: CakeFinish })
  @IsEnum(CakeFinish)
  finishType!: CakeFinish;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialDetails?: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  peopleCount!: number;

  @ApiProperty({ type: [String], default: [] })
  @IsArray()
  @IsString({ each: true })
  referenceImages!: string[];
}
