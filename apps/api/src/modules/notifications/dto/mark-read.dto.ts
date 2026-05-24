import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class MarkNotificationReadDto {
  @ApiProperty({ default: true })
  @IsBoolean()
  isRead!: boolean;
}