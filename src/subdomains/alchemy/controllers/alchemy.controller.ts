import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { AlchemyWebhookDto } from '../dto/alchemy-webhook.dto';
import { AlchemyWebhookService } from '../services/alchemy-webhook.service';

@ApiTags('Alchemy')
@Controller('alchemy')
export class AlchemyController {
  constructor(private readonly alchemyWebhookService: AlchemyWebhookService) {}

  @Post('create-frankencoin-monitoring-webhook')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async createFrankencoinMonitoringWebhook(): Promise<void> {
    await this.alchemyWebhookService.createFrankencoinMonitoringWebhook();
  }

  @Post('address-webhook')
  @ApiExcludeEndpoint()
  async addressWebhook(@Body() dto: AlchemyWebhookDto): Promise<void> {
    this.alchemyWebhookService.processAddressWebhook(dto);
  }
}
