import { Injectable, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { WalletService } from 'src/subdomains/user/application/services/wallet.service';
import {
  LnBitsLnurlPayRequestDto,
  LnBitsLnurlpInvoiceDto,
} from '../../../integration/blockchain/lightning/dto/lnbits.dto';
import { LightningClient } from '../../../integration/blockchain/lightning/lightning-client';
import { LightningHelper } from '../../../integration/blockchain/lightning/lightning-helper';
import { LightningService } from '../../../integration/blockchain/lightning/services/lightning.service';

@Injectable()
export class LightningForwardService {
  private readonly client: LightningClient;

  constructor(private readonly walletService: WalletService, lightningService: LightningService) {
    this.client = lightningService.getDefaultClient();
  }

  // --- LNDHUB --- //
  async lndhubRequest(req: Request, body: any, params: any): Promise<any> {
    const lastUrlpart = this.getLastUrlPart(req);
    if (!lastUrlpart) return null;

    return this.client.lndhubRequest({
      method: req.method,
      headers: req.headers,
      lastUrlpart: lastUrlpart,
      body: body,
      params: params,
    });
  }

  // --- Wellknown --- //
  async wellknownForward(address: string, asset?: string): Promise<LnBitsLnurlPayRequestDto> {
    const wallet = await this.walletService.getByLnbitsAddress(address);
    if (!wallet) throw new NotFoundException('Wallet not found');

    asset ??= 'BTC';

    const lighningWallet = wallet.lightningWallets.find((w) => w.asset === asset);
    if (!lighningWallet) throw new NotFoundException('Lightning Wallet not found');

    const payRequest = await this.lnurlpForward(lighningWallet.lnurlpId);

    payRequest.metadata = this.adaptMetadata(payRequest.metadata, address);

    return payRequest;
  }

  private adaptMetadata(metadata: string, address: string): string {
    try {
      const metadataArray: string[][] = JSON.parse(metadata);

      // text/plain
      const metadataTextPlain = metadataArray.find((m) => m[0] === 'text/plain');

      if (metadataTextPlain) {
        metadataTextPlain[1] = `${metadataTextPlain[1]} to lightning.space user: ${address}`;
      }

      // text/identifier
      const metadataTextIdentifier = metadataArray.find((m) => m[0] === 'text/identifier');

      if (!metadataTextIdentifier) {
        metadataArray.push(['text/identifier', LightningHelper.getLightningAddress(address)]);
      }

      metadata = JSON.stringify(metadataArray);
    } catch {
      // in case of any error, do nothing ...
    }

    return metadata;
  }

  // --- LNURLp --- //
  async lnurlpForward(id: string): Promise<LnBitsLnurlPayRequestDto> {
    const payRequest = await this.client.getLnurlpPaymentRequest(id);

    payRequest.callback = LightningHelper.createLnurlpCallbackUrl(id);

    return payRequest;
  }

  async lnurlpCallbackForward(id: string, params: any): Promise<LnBitsLnurlpInvoiceDto> {
    return this.client.getLnurlpInvoice(id, params);
  }

  // --- UTILITIES --- //
  private getLastUrlPart(req: Request): string | undefined {
    return req.path.split('/').at(-1);
  }
}
