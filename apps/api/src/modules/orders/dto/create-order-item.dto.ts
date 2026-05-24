import { ApiProperty } from '@nestjs/swagger';
import { CakeShape, CakeType } from '@sugarprecision/shared-types';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({ enum: CakeType })
  @IsEnum(CakeType)
  cakeType!: CakeType;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  layers!: number;

  @ApiProperty({ enum: CakeShape })
  @IsEnum(CakeShape)
  shape!: CakeShape;

  @ApiProperty()
  @IsString()
  filling!: string;

  @ApiProperty({ required: false })
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