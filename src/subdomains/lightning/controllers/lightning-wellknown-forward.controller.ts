import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiQuery, ApiTags } from '@nestjs/swagger';
import { LnurlpResponse, PubKeyResponse } from '@uma-sdk/core';
import { LnBitsLnurlPayRequestDto, LnBitsLnurlpInvoiceDto } from 'src/integration/blockchain/lightning/dto/lnbits.dto';
import { UmaService } from 'src/integration/blockchain/uma/services/uma.service';
import { LightningForwardService } from '../services/lightning-forward.service';

@ApiTags('Wellknown')
@Controller('.well-known')
export class LightingWellknownForwardController {
  constructor(private forwardService: LightningForwardService, private umaService: UmaService) {}

  @Get('lnurlp/:address')
  @ApiQuery({ name: 'asset', required: false, type: String })
  @ApiQuery({ name: 'amount', required: false, type: Number })
  async wellknownForward(
    @Req() request,
    @Param('address') address: string,
    @Query('asset') asset?: string,
    @Query('amount') amount?: number,
  ): Promise<LnBitsLnurlPayRequestDto | LnurlpResponse | LnBitsLnurlpInvoiceDto> {
    // Address starts with $: It's a UMA request!
    if (address.startsWith('$')) {
      const url = `${request.protocol}://${request.get('Host')}${request.originalUrl}`;
      return this.umaService.wellknownRequest(address, url);
    }

    if (asset && amount) return this.umaService.createAssetInvoice(address, asset, amount);

    return this.forwardService.wellknownForward(address, asset);
  }

  @Get('lnurlpubkey')
  @ApiExcludeEndpoint()
  wellknownUmaPubKey(): PubKeyResponse {
    return this.umaService.wellknownUmaPubKey();
  }
}
