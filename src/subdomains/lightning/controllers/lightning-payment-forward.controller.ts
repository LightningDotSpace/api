import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiExcludeController, ApiTags } from '@nestjs/swagger';
import { LightningForwardService } from '../services/lightning-forward.service';

@ApiTags('LNURL')
@Controller('lnurlp')
@ApiExcludeController()
export class LightingPaymentForwardController {
  constructor(private forwardService: LightningForwardService) {}

  @Get('cb/:address')
  async lnUrlPCallbackForward(@Param('address') address: string, @Query() params: any): Promise<any> {
    return this.forwardService.lnurlpCallbackForward(address, params);
  }
}
