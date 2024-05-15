import { Body, Controller, Post } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { LnBitsPaymentWebhookDto } from '../dto/lnbits.dto';
import { LnbitsWebHookService } from '../services/lnbits-webhook.service';

@ApiTags('LNbits')
@Controller('lnbits')
export class LnbitsWebhookController {
  constructor(private readonly lightningWebHookService: LnbitsWebHookService) {}

  @Post('payment-webhook')
  @ApiExcludeEndpoint()
  async lnbitsWebhook(@Body() dto: LnBitsPaymentWebhookDto): Promise<void> {
    this.lightningWebHookService.processPayment(dto);
  }
}
