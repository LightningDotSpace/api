import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BalanceDto } from '../dto/boltz.dto';
import { BoltzBalanceService } from '../services/boltz-balance.service';

@ApiTags('Boltz')
@Controller('boltz')
export class BoltzController {
  constructor(private readonly boltzBalanceService: BoltzBalanceService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get Boltz wallet balances (public)' })
  @ApiOkResponse({ type: [BalanceDto] })
  async getWalletBalance(): Promise<BalanceDto[]> {
    return this.boltzBalanceService.getWalletBalance();
  }
}
