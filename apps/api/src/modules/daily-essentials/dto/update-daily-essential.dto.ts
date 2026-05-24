import { PartialType } from '@nestjs/swagger';
import { CreateDailyEssentialDto } from './create-daily-essential.dto';

export class UpdateDailyEssentialDto extends PartialType(CreateDailyEssentialDto) {}