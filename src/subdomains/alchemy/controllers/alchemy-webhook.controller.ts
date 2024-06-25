import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { AddressActivityWebhook } from 'alchemy-sdk';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { AlchemyWebhookDto } from '../dto/alchemy-webhook.dto';
import { AlchemyWebhookService } from '../services/alchemy-webhook.service';

@ApiTags('Alchemy')
@Controller('alchemy')
export class AlchemyWebhookController {
  constructor(private readonly alchemyWebhookService: AlchemyWebhookService) {}

  @Post('create-frankencoin-payment-webhooks')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async createFrankencoinPaymentWebhooks(): Promise<AddressActivityWebhook[]> {
    return this.alchemyWebhookService.createFrankencoinPaymentWebhooks();
  }

  @Post('frankencoin-payment-webhook')
  @ApiExcludeEndpoint()
  async addressWebhook(
    @Headers('X-Alchemy-Signature') alchemySignature: string,
    @Body() dto: AlchemyWebhookDto,
  ): Promise<void> {
    if (this.alchemyWebhookService.isValidWebhookSignature(alchemySignature, dto)) {
      this.alchemyWebhookService.processFrankencoinPaymentWebhook(dto);
    }
  }
}
