import { Injectable, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { WalletRepository } from 'src/subdomains/user/application/repositories/wallet.repository';
import { LnBitsLnurlPayRequestDto, LnBitsLnurlpInvoiceDto } from '../dto/lnbits.dto';
import { LightningClient } from '../lightning-client';
import { LightningHelper } from '../lightning-helper';
import { LightningService } from './lightning.service';

@Injectable()
export class LightningForwardService {
  private readonly client: LightningClient;

  constructor(private readonly walletRepository: WalletRepository, lightningService: LightningService) {
    this.client = lightningService.getDefaultClient();
  }

  // --- LNDHUB --- //
  async lndhubRequest(req: Request, body: any, params: any): Promise<any> {
    const authorization = this.getAuthorization(req);

    const lastUrlpart = this.getLastUrlPart(req);
    if (!lastUrlpart) return null;

    return this.client.lndhubRequest({
      method: req.method,
      lastUrlpart: lastUrlpart,
      authorization: authorization,
      body: body,
      params: params,
    });
  }

  // --- Wellknown --- //
  async wellknownForward(address: string, asset?: string): Promise<LnBitsLnurlPayRequestDto> {
    const wallet = await this.walletRepository.findOneBy({ lnbitsAddress: address });
    if (!wallet) throw new NotFoundException('Wallet not found');

    if (!asset) asset = 'BTC';

    const lighningWallet = await wallet.lightningWallets.find((w) => w.asset === asset);
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
  private getAuthorization(req: Request): string | undefined {
    return req.header('Authorization');
  }

  private getLastUrlPart(req: Request): string | undefined {
    return req.url.split('/').at(-1);
  }
}
