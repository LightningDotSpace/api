import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { LnBitsLnurlPayRequestDto } from '../dto/lnbits.dto';
import { LightningForwardService } from '../services/lightning-forward.service';

@ApiTags('Wellknown')
@Controller('.well-known/lnurlp')
export class LightingWellknownForwardController {
  constructor(private forwardService: LightningForwardService) {}

  @Get(':address')
  @ApiQuery({ name: 'asset', required: false, type: String })
  async wellknownForward(
    @Param('address') address: string,
    @Query('asset') asset?: string,
  ): Promise<LnBitsLnurlPayRequestDto> {
    return this.forwardService.wellknownForward(address, asset);
  }
}
