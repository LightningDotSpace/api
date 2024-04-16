import { Injectable, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { LightningCurrencyService } from 'src/subdomains/lightning/services/lightning-currency.service';
import { WalletService } from 'src/subdomains/user/application/services/wallet.service';
import { LightningWalletEntity } from 'src/subdomains/user/domain/entities/lightning-wallet.entity';
import {
  LnBitsLnurlPayRequestDto,
  LnBitsLnurlWithdrawRequestDto,
  LnBitsLnurlpInvoiceDto,
  LnBitsLnurlwInvoiceDto,
} from '../../../integration/blockchain/lightning/dto/lnbits.dto';
import { LightningClient } from '../../../integration/blockchain/lightning/lightning-client';
import { LightningHelper } from '../../../integration/blockchain/lightning/lightning-helper';
import { LightningService } from '../../../integration/blockchain/lightning/services/lightning.service';
import { LightingWalletPaymentParamDto } from '../dto/lightning-wallet.dto';

@Injectable()
export class LightningForwardService {
  private readonly logger = new LightningLogger(LightningForwardService);

  private readonly client: LightningClient;

  constructor(
    private readonly walletService: WalletService,
    lightningService: LightningService,
    private readonly lightningCurrencyService: LightningCurrencyService,
  ) {
    this.client = lightningService.getDefaultClient();
  }

  // --- LNDHUB --- //
  async lndhubRequest<T>(req: Request, body: any, params: any): Promise<T | null> {
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
  async wellknownForward(address: string): Promise<LnBitsLnurlPayRequestDto> {
    return this.lnurlpForward(address);
  }

  async getLnurlpId(address: string): Promise<string> {
    return this.getLightningWallet(address).then((lw) => lw.lnurlpId);
  }

  private async getLightningWallet(address: string): Promise<LightningWalletEntity> {
    const wallet = await this.walletService.getByLnbitsAddress(address);
    if (!wallet) throw new NotFoundException('Wallet not found');

    const assetName = 'BTC';

    const lightningWallet = wallet.lightningWallets.find((w) => w.asset.name === assetName);
    if (!lightningWallet) throw new NotFoundException('Lightning Wallet not found');

    return lightningWallet;
  }

  // --- LNURLp --- //
  async lnurlpForward(address: string): Promise<LnBitsLnurlPayRequestDto> {
    const lnurlpId = await this.getLnurlpId(address);
    const payRequest = await this.client.getLnurlpPaymentRequest(lnurlpId);

    payRequest.callback = LightningHelper.createLnurlpCallbackUrl(address);

    await this.addCurrencies(payRequest);

    return payRequest;
  }

  private async addCurrencies(payRequest: LnBitsLnurlPayRequestDto) {
    try {
      await this.lightningCurrencyService.updateCurrencyMultipliers();
      payRequest.currencies = this.lightningCurrencyService.getCurrencies();
    } catch (e) {
      this.logger.error('Cannot add currencies to pay request', e);
    }
  }

  async lnurlpCallbackForward(address: string, params: any): Promise<LnBitsLnurlpInvoiceDto> {
    const walletPaymentParam = this.lightningCurrencyService.getWalletPaymentParam(address, params);
    if (walletPaymentParam.currencyCode && walletPaymentParam.amount)
      return this.lnbitsWalletPayment(walletPaymentParam);

    const lnurlpId = await this.getLnurlpId(address);
    return this.client.getLnurlpInvoice(lnurlpId, params);
  }

  private async lnbitsWalletPayment(
    walletPaymentParam: LightingWalletPaymentParamDto,
  ): Promise<LnBitsLnurlpInvoiceDto> {
    this.lightningCurrencyService.walletPaymentParamCheck(walletPaymentParam);
    this.lightningCurrencyService.fillWalletPaymentMemo(walletPaymentParam);

    const adminKey = await this.getLightningWallet(walletPaymentParam.address).then((lw) => lw.adminKey);

    return this.client.getLnBitsWalletPayment(adminKey, walletPaymentParam);
  }

  // --- LNURLw --- //
  async lnurlwForward(id: string): Promise<LnBitsLnurlWithdrawRequestDto> {
    const withdrawRequest = await this.client.getLnurlwWithdrawRequest(id);

    withdrawRequest.callback = LightningHelper.createLnurlwCallbackUrl(id);

    return withdrawRequest;
  }

  async lnurlwCallbackForward(id: string, params: any): Promise<LnBitsLnurlwInvoiceDto> {
    return this.client.sendLnurlwInvoice(id, params);
  }

  // --- UTILITIES --- //
  private getLastUrlPart(req: Request): string | undefined {
    return req.path.split('/').at(-1);
  }
}
