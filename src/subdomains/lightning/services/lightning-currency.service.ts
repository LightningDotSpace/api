import { BadRequestException, Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { Currency } from '@uma-sdk/core';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { LightningHelper } from '../../../integration/blockchain/lightning/lightning-helper';
import { CoinGeckoService } from '../../support/services/coingecko.service';

@Injectable()
export class LightningCurrencyService implements OnModuleInit {
  private readonly logger = new LightningLogger(LightningCurrencyService);

  private currencyCache: Map<string, Currency>;

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
      symbol: 'SAT',
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

  getCurrency(currencyCode: string): Currency | undefined {
    return this.currencyCache.get(currencyCode);
  }

  async updateCurrencyMultipliers(): Promise<void> {
    for (const currency of this.currencyCache.values()) {
      if (currency.code !== 'sat') {
        currency.multiplier = await this.getMultiplier(currency);
      }
    }
  }

  async calculatePayAmount(currencyCode: string, amount: number): Promise<number> {
    try {
      const currency = this.getCurrency(currencyCode.toLowerCase());
      if (!currency) throw new BadRequestException(`Unknown currency ${currencyCode}`);

      if (Number.isNaN(+amount)) throw new BadRequestException(`Amount ${amount} must be a number`);

      const minSendable = currency.minSendable / 10 ** currency.decimals;
      const maxSendable = currency.maxSendable / 10 ** currency.decimals;

      if (amount < minSendable) throw new BadRequestException(`Amount ${amount} is lower than min. ${minSendable}`);
      if (amount > maxSendable) throw new BadRequestException(`Amount ${amount} is higher than max. ${maxSendable}`);

      const conversionRate = currencyCode === 'sat' ? currency.multiplier : await this.getMultiplier(currency);
      return amount * 10 ** currency.decimals * conversionRate;
    } catch (e) {
      if (e instanceof BadRequestException) throw e;

      this.logger.error(`Calculate pay amount for currency ${currencyCode} failed`, e);
      throw new BadRequestException(`Calculate pay amount for currency ${currencyCode} failed`);
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
}
