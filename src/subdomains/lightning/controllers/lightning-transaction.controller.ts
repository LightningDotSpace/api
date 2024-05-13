import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { LnBitsPaymentWebhookDto } from 'src/integration/blockchain/lightning/dto/lnbits.dto';
import { LightningTransactionDto } from '../dto/lightning-transaction.dts';
import { LightningTransactionService } from '../services/lightning-transaction.service';

@ApiTags('Transaction')
@Controller('lightning')
export class LightingTransactionController {
  constructor(private lightningTransactionService: LightningTransactionService) {}

  @Get('tx/:id')
  async getTransactionInfo(@Param('id') id: string): Promise<LightningTransactionDto[]> {
    return this.lightningTransactionService.getTransactionInfo(id);
  }

  @Post('payment-webhook')
  @ApiExcludeEndpoint()
  async lnbitsWebhook(@Body() dto: LnBitsPaymentWebhookDto): Promise<void> {
    await this.lightningTransactionService.updatePaymentRequest(dto);
  }
}
