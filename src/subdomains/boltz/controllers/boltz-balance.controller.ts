import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BoltzBalanceResponseDto } from '../dto/boltz-balance.dto';
import { BoltzBalanceService } from '../services/boltz-balance.service';

@ApiTags('Boltz Balance')
@Controller('boltz-balance')
export class BoltzBalanceController {
  constructor(private readonly boltzBalanceService: BoltzBalanceService) {}

  @Get()
  @ApiOperation({ summary: 'Get Boltz wallet balances (public)' })
  @ApiOkResponse({ type: BoltzBalanceResponseDto })
  async getWalletBalance(): Promise<BoltzBalanceResponseDto> {
    return this.boltzBalanceService.getWalletBalance();
  }
}
