import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePrintJobDto {
  @ApiProperty()
  @IsString()
  orderId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  printerId?: string;

  @ApiProperty({ default: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  copies!: number;
}