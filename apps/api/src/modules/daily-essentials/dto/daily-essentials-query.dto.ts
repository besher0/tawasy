import { ApiPropertyOptional } from '@nestjs/swagger';
import { EssentialsCategory, EssentialsStatus } from '@sugarprecision/shared-types';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class DailyEssentialsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional({ enum: EssentialsCategory })
  @IsOptional()
  @IsEnum(EssentialsCategory)
  category?: EssentialsCategory;

  @ApiPropertyOptional({ enum: EssentialsStatus })
  @IsOptional()
  @IsEnum(EssentialsStatus)
  status?: EssentialsStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  targetDate?: string;
}