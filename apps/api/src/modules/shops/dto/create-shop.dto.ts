import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateShopDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  location!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactInfo?: string;
}