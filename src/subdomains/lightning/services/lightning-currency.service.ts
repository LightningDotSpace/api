import { BadRequestException, Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { Currency } from '@uma-sdk/core';
import { Config } from 'src/config/config';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { LightningHelper } from '../../../integration/blockchain/lightning/lightning-helper';
import { CoinGeckoService } from '../../support/services/coingecko.service';
import { LightingWalletPaymentParamDto } from '../dto/lightning-wallet.dto';

@Injectable()
export class LightningCurrencyService implements OnModuleInit {
  private readonly logger = new LightningLogger(LightningCurrencyService);

  private currencyCache: Map<string, Currency>;

  private currencyFormat = /^([$₣€§])?(\d+\.?\d*)$/;

  constructor(private readonly coingeckoService: CoinGeckoService) {
    this.currencyCache = new Map();
  }

  // TODO: data will be provided via a database table in the next version
  onModuleInit() {
    this.currencyCache.set('usd', {
      symbol: '$',
      code: 'usd',
      name: 'US Dollar',
      minSendable: 1,
      maxSendable: 1_000_000,
      multiplier: 0,
      decimals: 2,
    });

    this.currencyCache.set('chf', {
      symbol: '₣',
      code: 'chf',
      name: 'Swiss Franc',
      minSendable: 1,
      maxSendable: 1_000_000,
      multiplier: 0,
      decimals: 2,
    });

    this.currencyCache.set('eur', {
      symbol: '€',
      code: 'eur',
      name: 'Euro',
      minSendable: 1,
      maxSendable: 1_000_000,
      multiplier: 0,
      decimals: 2,
    });

    this.currencyCache.set('sat', {
      symbol: '§',
      code: 'sat',
      name: 'Satoshi',
      minSendable: 1,
      maxSendable: 10_000_000_000,
      multiplier: 1000,
      decimals: 0,
    });
  }

  getCurrencies(): Currency[] {
    return [...this.currencyCache.values()];
  }

  getCurrencyByCode(currencyCode: string): Currency | undefined {
    return this.currencyCache.get(currencyCode.toLowerCase());
  }

  getCurrencyBySymbol(symbol: string): Currency | undefined {
    return this.getCurrencies().find((c) => c.symbol === symbol);
  }

  async updateCurrencyMultipliers(): Promise<void> {
    for (const currency of this.currencyCache.values()) {
      if (currency.code !== 'sat') {
        currency.multiplier = await this.getMultiplier(currency);
      }
    }
  }

  async getMultiplier(currency: Currency): Promise<number> {
    const decimals = currency.decimals;

    const base = decimals ? 1 / 10 ** decimals : 1;

    const price = await this.getPriceInBTC(currency.code);

    return LightningHelper.btcToMsat(base / price);
  }

  private async getPriceInBTC(from: string): Promise<number> {
    const price = await this.coingeckoService.getPrice(from, 'btc');
    if (!price.isValid) throw new InternalServerErrorException(`Invalid price from ${from} to btc`);

    return price.price;
  }

  getWalletPaymentParam(address: string, params: any): LightingWalletPaymentParamDto {
    const match = new RegExp(this.currencyFormat).exec(params.amount);
    if (!match?.[1]) return { address, currencyCode: params.currency, amount: params.amount };

    return { address, currencyCode: this.getCurrencyBySymbol(match[1])?.code ?? '', amount: match[2] };
  }

  walletPaymentParamCheck(walletPaymentParam: LightingWalletPaymentParamDto) {
    const currencyCode = walletPaymentParam.currencyCode ?? '';
    const amount = walletPaymentParam.amount ?? '';

    const currency = this.getCurrencyByCode(currencyCode);
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

    if (currencyCode === 'CHF') {
      memo += ` Alternatively, send ${amount} ${currencyCode} to ${Config.commonPaymentAddress} via Ethereum, Polygon, Arbitrum, Optimism or Base.`;
    }

    walletPaymentParam.memo = memo;
  }
}
