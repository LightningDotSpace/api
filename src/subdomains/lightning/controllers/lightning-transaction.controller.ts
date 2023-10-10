import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LightningTransactionDto } from '../dto/lightning-transaction.dts';
import { LightningTransactionService } from '../services/lightning-transaction.service';

@ApiTags('Transaction')
@Controller('info')
export class LightingTransactionController {
  constructor(private lightningTransactionService: LightningTransactionService) {}

  @Get('getTransactionInfo')
  async getTransactionInfo(@Query('id') id: string): Promise<LightningTransactionDto[]> {
    return this.lightningTransactionService.getTransactionInfo(id);
  }
}
