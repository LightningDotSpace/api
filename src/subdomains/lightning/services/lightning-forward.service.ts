import { Injectable, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { Util } from 'src/shared/utils/util';
import { EvmPaymentService } from 'src/subdomains/evm/payment/services/evm-payment.service';
import { AssetService } from 'src/subdomains/master-data/asset/services/asset.service';
import {
  EvmPaymentRequestDto,
  LightningPaymentRequestDto,
  PaymentRequestDto,
} from 'src/subdomains/payment-request/dto/payment-request.dto';
import { PaymentRequestMethod } from 'src/subdomains/payment-request/entities/payment-request.entity';
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
    private readonly lightningService: LightningService,
    private readonly evmPaymentService: EvmPaymentService,
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

  private async getLightningWallet(
    address: string,
    assetName = AssetService.BTC_ACCOUNT_ASSET_NAME,
  ): Promise<LightningWalletEntity> {
    const wallet = await this.walletService.getByLnbitsAddress(address);
    if (!wallet) throw new NotFoundException('Wallet not found');

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
    await this.addPaymentMethods(payRequest);

    return payRequest;
  }

  private async addCurrencies(payRequest: LnBitsLnurlPayRequestDto) {
    try {
      payRequest.currencies = await this.lightningService.getCurrencies(true);
    } catch (e) {
      this.logger.error('Cannot add currencies to pay request', e);
    }
  }

  private async addPaymentMethods(payRequest: LnBitsLnurlPayRequestDto) {
    try {
      payRequest.methods = await this.lightningService.getPaymentMethods();
    } catch (e) {
      this.logger.error('Cannot add payment methods to pay request', e);
    }
  }

  async lnurlpCallbackForward(address: string, params: any): Promise<LnBitsLnurlpInvoiceDto | PaymentRequestDto> {
    const walletPaymentParam = await this.lightningService.getWalletPaymentParam(address, params);
    if (walletPaymentParam.currencyCode && walletPaymentParam.amount)
      return this.createPaymentRequest(walletPaymentParam);

    const lnurlpId = await this.getLnurlpId(address);
    return this.client.getLnurlpInvoice(lnurlpId, params);
  }

  private async createPaymentRequest(walletPaymentParam: LightingWalletPaymentParamDto): Promise<PaymentRequestDto> {
    walletPaymentParam.method ??= PaymentRequestMethod.LIGHTNING;

    await this.lightningService.walletPaymentParamCheck(walletPaymentParam);

    if (Util.equalsIgnoreCase(walletPaymentParam.method, PaymentRequestMethod.LIGHTNING)) {
      return this.createLightningPaymentRequest(walletPaymentParam);
    }

    return this.createEvmPaymentRequest(walletPaymentParam);
  }

  private async createLightningPaymentRequest(
    walletPaymentParam: LightingWalletPaymentParamDto,
  ): Promise<LightningPaymentRequestDto> {
    const btcLightningWallet = await this.getLightningWallet(
      walletPaymentParam.address,
      AssetService.BTC_ACCOUNT_ASSET_NAME,
    );

    const chfLightningWallet = await this.getLightningWallet(
      walletPaymentParam.address,
      AssetService.CHF_ACCOUNT_ASSET_NAME,
    );

    return this.lightningService.createPaymentRequest(walletPaymentParam, btcLightningWallet, chfLightningWallet);
  }

  private async createEvmPaymentRequest(
    walletPaymentParam: LightingWalletPaymentParamDto,
  ): Promise<EvmPaymentRequestDto> {
    const chfLightningWallet = await this.getLightningWallet(
      walletPaymentParam.address,
      AssetService.CHF_ACCOUNT_ASSET_NAME,
    );

    return this.evmPaymentService.createPaymentRequest(walletPaymentParam, chfLightningWallet);
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
