import { ApiProperty } from '@nestjs/swagger';
import { EssentialsCategory, EssentialsStatus } from '@sugarprecision/shared-types';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateDailyEssentialDto {
  @ApiProperty()
  @IsString()
  shopId!: string;

  @ApiProperty({ enum: EssentialsCategory })
  @IsEnum(EssentialsCategory)
  category!: EssentialsCategory;

  @ApiProperty()
  @IsString()
  itemName!: string;

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ enum: EssentialsStatus, required: false })
  @IsOptional()
  @IsEnum(EssentialsStatus)
  status?: EssentialsStatus;

  @ApiProperty()
  @IsDateString()
  targetDate!: string;
}