import { ApiProperty } from '@nestjs/swagger';
import { ShopType } from '@sugarprecision/shared-types';
import { IsEnum, IsOptional, IsString } from 'class-validator';

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

  @ApiProperty({ enum: ShopType, required: false, default: ShopType.BRANCH })
  @IsOptional()
  @IsEnum(ShopType)
  type?: ShopType;
}
