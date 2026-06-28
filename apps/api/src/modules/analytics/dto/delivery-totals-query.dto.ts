import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class DeliveryTotalsQueryDto {
  @ApiPropertyOptional({ description: 'Inclusive ISO start datetime' })
  @IsOptional()
  @IsDateString()
  start?: string;

  @ApiPropertyOptional({ description: 'Exclusive ISO end datetime' })
  @IsOptional()
  @IsDateString()
  end?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;
}
