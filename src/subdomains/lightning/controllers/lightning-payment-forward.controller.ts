import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { LnBitsLnurlPayRequestDto } from 'src/integration/blockchain/lightning/dto/lnbits.dto';
import { LightningForwardService } from '../services/lightning-forward.service';

@ApiTags('LNURL')
@Controller('lnurlp')
export class LightingPaymentForwardController {
  constructor(private forwardService: LightningForwardService) {}

  @Get(':id')
  async lnUrlPForward(@Param('id') id: string): Promise<LnBitsLnurlPayRequestDto> {
    return this.forwardService.lnurlpForward(id);
  }

  @Get('cb/:id')
  @ApiQuery({ name: 'amount', required: true, type: String })
  async lnUrlPCallbackForward(@Param('id') id: string, @Query() params: any): Promise<any> {
    return this.forwardService.lnurlpCallbackForward(id, params);
  }
}
