import { BadRequestException, Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Config } from 'src/config/config';
import { Util } from 'src/shared/utils/util';
import { LnBitsTransactionDto } from '../dto/lnbits.dto';
import { LnbitsWebHookService } from '../services/lnbits-webhook.service';

@ApiTags('LNbits')
@Controller('lnbits')
export class LnbitsWebhookController {
  constructor(private readonly lightningWebHookService: LnbitsWebHookService) {}

  @Post('transaction-webhook')
  @ApiExcludeEndpoint()
  async transactionWebhook(
    @Headers('LDS-LnbitsApi-Signature') lnbitsApiSignature: string,
    @Body() transactions: LnBitsTransactionDto[],
  ): Promise<void> {
    try {
      const isValid = Util.verifySign(
        JSON.stringify(transactions),
        Config.blockchain.lightning.lnbitsapi.certificate,
        lnbitsApiSignature,
      );

      if (isValid) {
        this.lightningWebHookService.processTransactions(transactions);
      }
    } catch (e) {
      throw new BadRequestException();
    }
  }
}
