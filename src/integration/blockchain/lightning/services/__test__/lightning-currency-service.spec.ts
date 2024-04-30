import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { TestUtil } from 'src/shared/utils/test.util';
import { LightingWalletPaymentParamDto } from 'src/subdomains/lightning/dto/lightning-wallet.dto';
import { AssetAccountEntity } from 'src/subdomains/master-data/asset/entities/asset-account.entity';
import { AssetTransferEntity } from 'src/subdomains/master-data/asset/entities/asset-transfer.entity';
import { AssetService } from 'src/subdomains/master-data/asset/services/asset.service';
import { CoinGeckoService } from 'src/subdomains/pricing/services/coingecko.service';
import { LightningCurrencyService } from '../lightning-currency.service';

describe('LightningCurrencyService', () => {
  let service: LightningCurrencyService;
  let assetService: AssetService;
  let coingeckoService: CoinGeckoService;

  const accountAssetCache = createAccountAssets();
  const transferAssetCache = createTransferAssets();

  beforeAll(async () => {
    const config = {
      evmPaymentAddress: 'TestEVMPaymentAddress',
    };

    assetService = createMock<AssetService>();
    coingeckoService = createMock<CoinGeckoService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LightningCurrencyService,
        { provide: AssetService, useValue: assetService },
        { provide: CoinGeckoService, useValue: coingeckoService },
        TestUtil.provideConfig(config),
      ],
    }).compile();

    service = module.get<LightningCurrencyService>(LightningCurrencyService);

    jest.spyOn(assetService, 'getActiveAccountAssets').mockImplementation(async (params) => getAccountAssets(params));
    jest.spyOn(assetService, 'getActiveTransferAssets').mockImplementation(async () => getTransferAssets());
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should detect valid currency', async () => {
    const address = 'x';

    const paymentParams = await service.getWalletPaymentParam(address, { amount: '122.44' });

    expect(paymentParams.currencyCode).toBeUndefined();
    expect(paymentParams.amount).toBe('122.44');
  });

  it('should detect valid currency and amount', async () => {
    const address = 'x';

    checkPaymentParams(
      await service.getWalletPaymentParam(address, { currency: 'usd', amount: '122.44' }),
      '122.44',
      'usd',
    );

    checkPaymentParams(
      await service.getWalletPaymentParam(address, { currency: 'eur', amount: '0.02' }),
      '0.02',
      'eur',
    );

    checkPaymentParams(await service.getWalletPaymentParam(address, { currency: 'chf', amount: '100' }), '100', 'chf');

    checkPaymentParams(
      await service.getWalletPaymentParam(address, { currency: 'btc', amount: '0.00000001' }),
      '0.00000001',
      'btc',
    );
  });

  it('should detect valid amount with symbol', async () => {
    const address = 'x';

    checkPaymentParams(await service.getWalletPaymentParam(address, { amount: '$122.44' }), '122.44', 'usd');
    checkPaymentParams(await service.getWalletPaymentParam(address, { amount: '€0.02' }), '0.02', 'eur');
    checkPaymentParams(await service.getWalletPaymentParam(address, { amount: '₣100.' }), '100.', 'chf');
    checkPaymentParams(await service.getWalletPaymentParam(address, { amount: 'B0.00000001' }), '0.00000001', 'btc');
  });

  function checkPaymentParams(
    paymentParams: LightingWalletPaymentParamDto,
    checkAmount: string,
    checkCurrencyCode: string,
  ) {
    expect(paymentParams.amount).toBe(checkAmount);
    expect(paymentParams.currencyCode).toBe(checkCurrencyCode);
  }

  it('should just pass through', async () => {
    const address = 'x';

    expect(await service.getWalletPaymentParam(address, { amount: '' })).toStrictEqual({
      address: 'x',
      currencyCode: undefined,
      amount: '',
      method: undefined,
    });

    expect(await service.getWalletPaymentParam(address, { amount: '&12' })).toStrictEqual({
      address: 'x',
      currencyCode: undefined,
      amount: '&12',
      method: undefined,
    });

    expect(await service.getWalletPaymentParam(address, { amount: 'Hello' })).toStrictEqual({
      address: 'x',
      currencyCode: undefined,
      amount: 'Hello',
      method: undefined,
    });

    expect(await service.getWalletPaymentParam(address, { amount: '33,44' })).toStrictEqual({
      address: 'x',
      currencyCode: undefined,
      amount: '33,44',
      method: undefined,
    });

    expect(await service.getWalletPaymentParam(address, { amount: '1.2.3' })).toStrictEqual({
      address: 'x',
      currencyCode: undefined,
      amount: '1.2.3',
      method: undefined,
    });
  });

  it('should detect invalid currency', async () => {
    expect(await service.getCurrencyBySymbol('')).toBeUndefined();
    expect(await service.getCurrencyBySymbol('x')).toBeUndefined();
    expect(await service.getCurrencyBySymbol('Hello')).toBeUndefined();
    expect(await service.getCurrencyBySymbol('128')).toBeUndefined();
  });

  it('should detect all valid currencies', async () => {
    const currencies = await service.getCurrencies();
    expect(currencies.length).toBeGreaterThan(0);

    for (let i = 0; i < currencies.length; i++) {
      const currency = currencies[i];

      expect((await service.getCurrencyByCode(currency.code))?.code).toBe(currency.code);
      expect((await service.getCurrencyBySymbol(currency.symbol))?.symbol).toBe(currency.symbol);

      const address = 'x';
      const amount = (i + 1) * 10;
      const paymentParam = await service.getWalletPaymentParam(address, { amount: `${currency.symbol}${amount}` });

      expect(paymentParam.amount).toBe(amount.toString());
      expect(paymentParam.currencyCode).toBe(currency.code);
    }
  });

  it('should detect valid payment params', async () => {
    const address = 'x';

    expect(() => service.walletPaymentParamCheck({ address, currencyCode: 'usd', amount: '1000' })).not.toThrow();
    expect(() => service.walletPaymentParamCheck({ address, currencyCode: 'eur', amount: '0.02' })).not.toThrow();
    expect(() => service.walletPaymentParamCheck({ address, currencyCode: 'chf', amount: '222.99' })).not.toThrow();
  });

  it('should detect invalid payment params', async () => {
    const address = 'x';

    await expect(() =>
      service.walletPaymentParamCheck({ address, currencyCode: 'xyz', amount: '100' }),
    ).rejects.toThrow('Unknown currency xyz');

    await expect(() =>
      service.walletPaymentParamCheck({ address, currencyCode: 'usd', amount: 'xyz' }),
    ).rejects.toThrow('USD amount xyz must be a number');

    await expect(() =>
      service.walletPaymentParamCheck({ address, currencyCode: 'eur', amount: '0.0099' }),
    ).rejects.toThrow('EUR amount 0.0099 is lower than min. 0.01');

    await expect(() =>
      service.walletPaymentParamCheck({ address, currencyCode: 'chf', amount: '100001' }),
    ).rejects.toThrow('CHF amount 100001 is higher than max. 10000');
  });

  it('should create wallet memo', () => {
    const walletPaymentParam: LightingWalletPaymentParamDto = {
      address: 'TestLightningAddress',
      currencyCode: 'usd',
      amount: '100',
    };
    service.fillWalletPaymentMemo(walletPaymentParam);

    expect(walletPaymentParam.memo).toBe('Pay this Lightning bill to transfer 100 USD to TestLightningAddress.');

    walletPaymentParam.currencyCode = 'chf';
    service.fillWalletPaymentMemo(walletPaymentParam);

    expect(walletPaymentParam.memo).toBe(
      'Pay this Lightning bill to transfer 100 CHF to TestLightningAddress. Alternatively, send 100 ZCHF to TestEVMPaymentAddress via Ethereum, Polygon, Arbitrum, Optimism or Base.',
    );
  });

  it('should detect all payment methods', async () => {
    const paymentMethods = await service.getPaymentMethods();
    expect(paymentMethods.length).toBe(3);

    expect(paymentMethods[0]).toBe(Blockchain.LIGHTNING);
    expect(paymentMethods[1]).toBe(Blockchain.ETHEREUM);
    expect(paymentMethods[2]).toBe(Blockchain.POLYGON);
  });

  // --- HELPERS --- //

  function createAccountAssets(): AssetAccountEntity[] {
    const accountAssets: AssetAccountEntity[] = [];

    accountAssets.push(createAccountAsset('btc', 'B', 1, 100000000, 8));
    accountAssets.push(createAccountAsset('usd', '$', 1, 1000000, 2));
    accountAssets.push(createAccountAsset('chf', '₣', 1, 1000000, 2));
    accountAssets.push(createAccountAsset('eur', '€', 1, 1000000, 2));

    return accountAssets;
  }

  function createAccountAsset(
    name: string,
    symbol: string,
    minSendable: number,
    maxSendable: number,
    decimals: number,
  ) {
    return Object.assign(new AssetAccountEntity(), { name, symbol, minSendable, maxSendable, decimals });
  }

  function getAccountAssets(params?: any): AssetAccountEntity[] {
    if (!params) return accountAssetCache;

    return accountAssetCache.filter((a) => a.name === params.name || a.symbol === params.symbol);
  }

  function createTransferAssets(): AssetTransferEntity[] {
    const transferAssets: AssetTransferEntity[] = [];

    transferAssets.push(createTransferAsset('SAT', Blockchain.LIGHTNING));
    transferAssets.push(createTransferAsset('ZCHF', Blockchain.ETHEREUM));
    transferAssets.push(createTransferAsset('ZCHF', Blockchain.POLYGON));

    return transferAssets;
  }

  function createTransferAsset(name: string, blockchain: Blockchain): AssetTransferEntity {
    return Object.assign(new AssetTransferEntity(), { name, blockchain });
  }

  function getTransferAssets(): AssetTransferEntity[] {
    return transferAssetCache;
  }
});
