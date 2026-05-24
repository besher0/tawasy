import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedRequestUser } from '../../common/decorators/current-user.decorator';
import { DevicesService } from './devices.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@ApiTags('devices')
@ApiBearerAuth()
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('push-token')
  async registerToken(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.devicesService.registerPushToken(user.sub, dto.token, dto.platform);
  }
}