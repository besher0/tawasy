import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '0500000002' })
  @IsString()
  phone!: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @Length(8, 72)
  password!: string;
}