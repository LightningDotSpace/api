import { Body, Controller, Get, Param, Put, Query, Req } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { LnurlpResponse, PubKeyResponse } from '@uma-sdk/core';
import { LnBitsLnurlPayRequestDto, LnBitsLnurlpLinkDto } from 'src/integration/blockchain/lightning/dto/lnbits.dto';
import { UmaService } from 'src/integration/blockchain/uma/services/uma.service';
import { UpdateWellknownForwardDto } from '../dto/lightning-wellknown-forward.dto';
import { LightningForwardService } from '../services/lightning-forward.service';

@ApiTags('Wellknown')
@Controller('.well-known')
export class LightingWellknownForwardController {
  constructor(private forwardService: LightningForwardService, private umaService: UmaService) {}

  @Get('lnurlp/:address')
  async wellknownForward(
    @Req() request,
    @Param('address') address: string,
  ): Promise<LnBitsLnurlPayRequestDto | LnurlpResponse> {
    // Address starts with $: It's a UMA request!
    if (address.startsWith('$')) {
      const url = `${request.protocol}://${request.get('Host')}${request.originalUrl}`;
      return this.umaService.wellknownRequest(address, url);
    }

    return this.forwardService.wellknownForward(address);
  }

  @Put('lnurlp/:address/asset/:assetName')
  async wellknownForwardUpdate(
    @Req() request,
    @Body() body: UpdateWellknownForwardDto,
    @Param('address') address: string,
    @Param('assetName') assetName: string,
  ): Promise<LnBitsLnurlpLinkDto> {
    return this.forwardService.wellknownForwardUpdate(request, address, assetName, body);
  }

  @Get('lnurlp/:address/cb')
  async lnUrlPCallbackForward(@Param('address') address: string, @Query() params: any): Promise<any> {
    return this.forwardService.lnurlpCallbackForward(address, params);
  }

  @Get('lnurlpubkey')
  @ApiExcludeEndpoint()
  wellknownUmaPubKey(): PubKeyResponse {
    return this.umaService.wellknownUmaPubKey();
  }
}
