import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Currency } from '@uma-sdk/core';
import { Config } from 'src/config/config';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { Util } from 'src/shared/utils/util';
import { AssetAccountEntity } from 'src/subdomains/master-data/asset/entities/asset-account.entity';
import { AssetService } from 'src/subdomains/master-data/asset/services/asset.service';
import { PaymentRequestMethod } from 'src/subdomains/payment-request/entities/payment-request.entity';
import { LightingWalletPaymentParamDto } from '../../../../subdomains/lightning/dto/lightning-wallet.dto';
import { CoinGeckoService } from '../../../../subdomains/pricing/services/coingecko.service';
import { LightningHelper } from '../lightning-helper';

@Injectable()
export class LightningCurrencyService {
  private readonly logger = new LightningLogger(LightningCurrencyService);

  private readonly currencyFormat = /^([$₣€B])?(\d+\.?\d*)$/;

  constructor(private readonly assetService: AssetService, private readonly coingeckoService: CoinGeckoService) {}

  async getPaymentMethods(): Promise<PaymentRequestMethod[]> {
    const paymentMethods: PaymentRequestMethod[] = [];

    const activeTransferAssets = await this.assetService.getActiveTransferAssets();

    const activeLightningTransferAsset = activeTransferAssets.find((a) => a.blockchain === Blockchain.LIGHTNING);
    if (activeLightningTransferAsset) paymentMethods.push(PaymentRequestMethod.LIGHTNING);

    const activeEvmTransferAssets = activeTransferAssets.filter((a) => a.blockchain !== Blockchain.LIGHTNING);
    if (activeEvmTransferAssets.length) paymentMethods.push(PaymentRequestMethod.EVM);

    return paymentMethods;
  }

  async getCurrencies(withMultiplier = false): Promise<Currency[]> {
    const activeAssets = await this.assetService.getActiveAccountAssets();

    return Promise.all(activeAssets.map((asset) => this.mapAsset(asset, withMultiplier)));
  }

  async getCurrencyByCode(currencyCode: string, withMultiplier = false): Promise<Currency | undefined> {
    const activeAssets = await this.assetService.getActiveAccountAssets({ name: currencyCode });

    if (activeAssets.length !== 1) {
      this.logger.error(`Invalid number of active lightning assets found for currency code: ${currencyCode}`);
      return;
    }

    return this.mapAsset(activeAssets[0], withMultiplier);
  }

  async getCurrencyBySymbol(symbol: string, withMultiplier = false): Promise<Currency | undefined> {
    const activeAssets = await this.assetService.getActiveAccountAssets({ symbol: symbol });

    if (activeAssets.length !== 1) {
      this.logger.error(`Invalid number of active lightning assets found for symbol: ${symbol}`);
      return;
    }

    return this.mapAsset(activeAssets[0], withMultiplier);
  }

  private async mapAsset(asset: AssetAccountEntity, withMultiplier: boolean): Promise<Currency> {
    return {
      symbol: asset.symbol,
      code: asset.name,
      name: asset.displayName,
      minSendable: asset.minSendable,
      maxSendable: asset.maxSendable,
      decimals: asset.decimals,
      multiplier:
        !Util.equalsIgnoreCase(asset.name, 'BTC') && withMultiplier
          ? await this.getMultiplier(asset.name, asset.decimals)
          : 0,
    };
  }

  async getMultiplier(currencyCode: string, decimals: number): Promise<number> {
    const base = decimals ? 1 / 10 ** decimals : 1;

    const price = await this.getPriceInBTC(currencyCode);

    return LightningHelper.btcToMsat(base / price);
  }

  private async getPriceInBTC(from: string): Promise<number> {
    const price = await this.coingeckoService.getPrice(from.toLowerCase(), 'btc');
    if (!price.isValid) throw new InternalServerErrorException(`Invalid price from ${from} to btc`);

    return price.price;
  }

  async getWalletPaymentParam(address: string, params: any): Promise<LightingWalletPaymentParamDto> {
    const match = new RegExp(this.currencyFormat).exec(params.amount);
    if (!match?.[1]) return { address, currencyCode: params.currency, amount: params.amount, method: params.method };

    return {
      address,
      currencyCode: (await this.getCurrencyBySymbol(match[1]))?.code ?? '',
      amount: match[2],
      method: params.method,
    };
  }

  async walletPaymentParamCheck(walletPaymentParam: LightingWalletPaymentParamDto): Promise<void> {
    const currencyCode = walletPaymentParam.currencyCode ?? '';
    const amount = walletPaymentParam.amount ?? '';

    const currency = await this.getCurrencyByCode(currencyCode);
    if (!currency) throw new BadRequestException(`Unknown currency ${currencyCode}`);

    if (Number.isNaN(+amount))
      throw new BadRequestException(`${currencyCode.toUpperCase()} amount ${amount} must be a number`);

    const minSendable = currency.minSendable / 10 ** currency.decimals;

    if (+amount < minSendable)
      throw new BadRequestException(`${currencyCode.toUpperCase()} amount ${amount} is lower than min. ${minSendable}`);

    const maxSendable = currency.maxSendable / 10 ** currency.decimals;

    if (+amount > maxSendable)
      throw new BadRequestException(
        `${currencyCode.toUpperCase()} amount ${amount} is higher than max. ${maxSendable}`,
      );
  }

  fillWalletPaymentMemo(walletPaymentParam: LightingWalletPaymentParamDto) {
    const currencyCode = walletPaymentParam.currencyCode?.toUpperCase() ?? '';
    const amount = walletPaymentParam.amount;
    const address = walletPaymentParam.address;

    let memo = `Pay this Lightning bill to transfer ${amount} ${currencyCode} to ${address}.`;

    if (currencyCode === AssetService.CHF_ACCOUNT_ASSET_NAME) {
      memo += ` Alternatively, send ${amount} ZCHF to ${Config.payment.evmAddress} via Ethereum, Polygon, Arbitrum, Optimism or Base.`;
    }

    walletPaymentParam.memo = memo;
  }
}
