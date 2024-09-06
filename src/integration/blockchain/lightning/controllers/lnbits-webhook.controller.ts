import { BadRequestException, Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Config } from 'src/config/config';
import { Util } from 'src/shared/utils/util';
import { BoltcardWebhookTransferDto } from '../dto/boltcards.dto';
import { LnBitsTransactionWebhookTransferDto } from '../dto/lnbits.dto';
import { LnbitsWebHookService } from '../services/lnbits-webhook.service';

@ApiTags('LNbits')
@Controller('lnbits')
export class LnbitsWebhookController {
  constructor(private readonly lightningWebHookService: LnbitsWebHookService) {}

  @Post('transaction-webhook')
  @ApiExcludeEndpoint()
  async transactionWebhook(
    @Headers('LDS-LnbitsApi-Signature') lnbitsApiSignature: string,
    @Body() webhookTransfer: LnBitsTransactionWebhookTransferDto,
  ): Promise<void> {
    try {
      if (this.isValid(lnbitsApiSignature, JSON.stringify(webhookTransfer))) {
        this.lightningWebHookService.processTransactions(webhookTransfer);
      }
    } catch (e) {
      throw new BadRequestException();
    }
  }

  @Post('boltcard-webhook')
  @ApiExcludeEndpoint()
  async boltcardWebhook(
    @Headers('LDS-LnbitsApi-Signature') lnbitsApiSignature: string,
    @Body() webhookTransfer: BoltcardWebhookTransferDto,
  ): Promise<void> {
    try {
      if (this.isValid(lnbitsApiSignature, JSON.stringify(webhookTransfer))) {
        this.lightningWebHookService.processBoltcards(webhookTransfer);
      }
    } catch (e) {
      throw new BadRequestException();
    }
  }

  private isValid(lnbitsApiSignature: string, data: string): boolean {
    return Util.verifySign(data, Config.blockchain.lightning.lnbitsapi.certificate, lnbitsApiSignature);
  }
}
