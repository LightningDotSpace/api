import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LightningTransactionDto } from '../dto/lightning-transaction.dts';
import { LightningTransactionService } from '../services/lightning-transaction.service';

@ApiTags('Transaction')
@Controller('lightning')
export class LightingTransactionController {
  constructor(private readonly lightningTransactionService: LightningTransactionService) {}

  @Get('tx/:id')
  async getTransactionInfo(@Param('id') id: string): Promise<LightningTransactionDto[]> {
    return this.lightningTransactionService.getTransactionInfo(id);
  }
}
