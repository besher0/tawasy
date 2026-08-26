import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CakeFinish,
  CakeShape,
  CakeType,
  MoldBaseType,
  MoldFlavor,
  MoldInnerColor,
  MoldOrderType,
  OrderItemKind,
} from '@sugarprecision/shared-types';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

function isFridgeMold(item: CreateOrderItemDto) {
  return (
    item.itemKind === OrderItemKind.MOLD &&
    item.moldOrderType === MoldOrderType.FRIDGE
  );
}

function isStandardMold(item: CreateOrderItemDto) {
  return item.itemKind === OrderItemKind.MOLD && !isFridgeMold(item);
}

export class CreateOrderItemDto {
  @ApiProperty({ enum: OrderItemKind })
  @IsEnum(OrderItemKind)
  itemKind!: OrderItemKind;

  @ApiPropertyOptional()
  @ValidateIf((item: CreateOrderItemDto) => item.itemKind === OrderItemKind.PIECES)
  @IsString()
  pieceType?: string;

  @ApiProperty({ default: false })
  @ValidateIf((item: CreateOrderItemDto) => !isFridgeMold(item))
  @IsBoolean()
  hasTopDecoration!: boolean;

  @ApiPropertyOptional({ enum: CakeType })
  @IsOptional()
  @IsEnum(CakeType)
  cakeType?: CakeType;

  @ApiProperty({ minimum: 1 })
  @ValidateIf((item: CreateOrderItemDto) => !isFridgeMold(item))
  @IsInt()
  @Min(1)
  layers!: number;

  @ApiPropertyOptional({ enum: CakeShape })
  @ValidateIf((item: CreateOrderItemDto) => isStandardMold(item))
  @IsEnum(CakeShape)
  shape?: CakeShape;

  @ApiPropertyOptional({ description: 'Letter or number when LetterOrNumber shape is selected' })
  @ValidateIf(
    (item: CreateOrderItemDto) =>
      item.itemKind === OrderItemKind.MOLD &&
      !isFridgeMold(item) &&
      item.shape === CakeShape.LETTER_OR_NUMBER,
  )
  @IsString()
  @IsNotEmpty()
  shapeText?: string;

  @ApiPropertyOptional({ enum: MoldOrderType, default: MoldOrderType.STANDARD })
  @IsOptional()
  @IsEnum(MoldOrderType)
  moldOrderType?: MoldOrderType;

  @ApiPropertyOptional({ description: 'Required for fridge mold orders' })
  @ValidateIf((item: CreateOrderItemDto) => isFridgeMold(item))
  @IsString()
  @IsNotEmpty()
  fridgeMoldName?: string;

  @ApiPropertyOptional({ enum: MoldFlavor })
  @ValidateIf((item: CreateOrderItemDto) => isStandardMold(item))
  @IsEnum(MoldFlavor)
  moldFlavor?: MoldFlavor;

  @ApiPropertyOptional({ enum: MoldInnerColor, description: 'Mold color from the inside' })
  @ValidateIf((item: CreateOrderItemDto) => isStandardMold(item))
  @IsEnum(MoldInnerColor)
  moldInnerColor?: MoldInnerColor;

  @ApiPropertyOptional({ description: 'Layer colors when the inner mold color is mixed' })
  @ValidateIf(
    (item: CreateOrderItemDto) =>
      item.itemKind === OrderItemKind.MOLD &&
      !isFridgeMold(item) &&
      item.moldInnerColor === MoldInnerColor.MIXED,
  )
  @IsString()
  @IsNotEmpty()
  moldLayerColors?: string;

  @ApiPropertyOptional({ description: 'Requested external mold color' })
  @ValidateIf((item: CreateOrderItemDto) => isStandardMold(item))
  @IsString()
  @IsNotEmpty()
  moldColor?: string;

  @ApiProperty({ default: false })
  @ValidateIf((item: CreateOrderItemDto) => !isFridgeMold(item))
  @IsBoolean()
  hasFillings!: boolean;

  @ApiPropertyOptional()
  @ValidateIf(
    (item: CreateOrderItemDto) => isStandardMold(item) && item.hasFillings,
  )
  @IsString()
  filling?: string;

  @ApiProperty({ enum: MoldBaseType, default: MoldBaseType.NONE })
  @ValidateIf((item: CreateOrderItemDto) => isStandardMold(item))
  @IsEnum(MoldBaseType)
  moldBaseType!: MoldBaseType;

  @ApiPropertyOptional({ minimum: 1, description: 'Number of foam pieces when foam is selected' })
  @ValidateIf(
    (item: CreateOrderItemDto) =>
      isStandardMold(item) && item.moldBaseType === MoldBaseType.FOAM,
  )
  @IsInt()
  @Min(1)
  foamCount?: number;

  @ApiPropertyOptional({ minimum: 1, description: 'Number of cake layers when cake is selected' })
  @ValidateIf(
    (item: CreateOrderItemDto) =>
      isStandardMold(item) && item.moldBaseType === MoldBaseType.CAKE,
  )
  @IsInt()
  @Min(1)
  cakeLayerCount?: number;

  @ApiProperty({ enum: CakeFinish })
  @ValidateIf((item: CreateOrderItemDto) => isStandardMold(item))
  @IsEnum(CakeFinish)
  finishType!: CakeFinish;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialDetails?: string;

  @ApiPropertyOptional({ description: 'Text written on the mold' })
  @IsOptional()
  @IsString()
  writingText?: string;

  @ApiProperty({ minimum: 1 })
  @ValidateIf((item: CreateOrderItemDto) => !isFridgeMold(item))
  @IsInt()
  @Min(1)
  peopleCount!: number;

  @ApiProperty({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceImages!: string[];
}
