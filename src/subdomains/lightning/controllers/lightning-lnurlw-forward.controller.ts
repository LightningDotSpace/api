import { Controller, Get, Param, Query } from '@nestjs/common';
import { LnBitsLnurlWithdrawRequestDto } from 'src/integration/blockchain/lightning/dto/lnbits.dto';
import { LightningForwardService } from '../services/lightning-forward.service';

@Controller('lnurlw')
export class LightingLnurlwForwardController {
  constructor(private forwardService: LightningForwardService) {}

  @Get('lnurlw/:id/:unique_hash')
  async lnurlwForward(
    @Param('id') id: string,
    @Param('unique_hash') uniqueHash: string,
  ): Promise<LnBitsLnurlWithdrawRequestDto> {
    return this.forwardService.lnurlwForward(id, uniqueHash);
  }

  @Get('lnurlw/cb/:id')
  async lnUrlWCallbackForward(@Param('id') id: string, @Query('k1') k1: string, @Query('pr') pr: string): Promise<any> {
    return this.forwardService.lnurlwCallbackForward(id, k1, pr);
  }
}
