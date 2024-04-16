import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { TestUtil } from 'src/shared/utils/test.util';
import { CoinGeckoService } from 'src/subdomains/support/services/coingecko.service';
import { LightingWalletPaymentParamDto } from '../../dto/lightning-wallet.dto';
import { LightningCurrencyService } from '../lightning-currency.service';

describe('LightningCurrencyService', () => {
  let service: LightningCurrencyService;
  let coingeckoService: CoinGeckoService;

  beforeAll(async () => {
    const config = {
      commonPaymentAddress: 'TestEVMPaymentAddress',
    };

    coingeckoService = createMock<CoinGeckoService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LightningCurrencyService,
        { provide: CoinGeckoService, useValue: coingeckoService },
        TestUtil.provideConfig(config),
      ],
    }).compile();

    service = module.get<LightningCurrencyService>(LightningCurrencyService);
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should detect valid currency', () => {
    const address = 'x';

    const paymentParams = service.getWalletPaymentParam(address, { amount: '122.44' });

    expect(paymentParams.currencyCode).toBeUndefined();
    expect(paymentParams.amount).toBe('122.44');
  });

  it('should detect valid currency and amount', () => {
    const address = 'x';

    checkPaymentParams(service.getWalletPaymentParam(address, { currency: 'usd', amount: '122.44' }), '122.44', 'usd');
    checkPaymentParams(service.getWalletPaymentParam(address, { currency: 'eur', amount: '0.02' }), '0.02', 'eur');
    checkPaymentParams(service.getWalletPaymentParam(address, { currency: 'chf', amount: '100' }), '100', 'chf');
    checkPaymentParams(service.getWalletPaymentParam(address, { currency: 'sat', amount: '1200.' }), '1200.', 'sat');
  });

  it('should detect valid amount and symbol', () => {
    const address = 'x';

    checkPaymentParams(service.getWalletPaymentParam(address, { amount: '$122.44' }), '122.44', 'usd');
    checkPaymentParams(service.getWalletPaymentParam(address, { amount: '€0.02' }), '0.02', 'eur');
    checkPaymentParams(service.getWalletPaymentParam(address, { amount: '₣100' }), '100', 'chf');
    checkPaymentParams(service.getWalletPaymentParam(address, { amount: '§1200.' }), '1200.', 'sat');
  });

  function checkPaymentParams(
    paymentParams: LightingWalletPaymentParamDto,
    checkAmount: string,
    checkCurrencyCode: string,
  ) {
    expect(paymentParams.amount).toBe(checkAmount);
    expect(paymentParams.currencyCode).toBe(checkCurrencyCode);
  }

  it('should just pass through', () => {
    const address = 'x';

    expect(service.getWalletPaymentParam(address, { amount: '' })).toStrictEqual({
      address: 'x',
      currencyCode: undefined,
      amount: '',
    });
    expect(service.getWalletPaymentParam(address, { amount: '&12' })).toStrictEqual({
      address: 'x',
      currencyCode: undefined,
      amount: '&12',
    });
    expect(service.getWalletPaymentParam(address, { amount: 'Hello' })).toStrictEqual({
      address: 'x',
      currencyCode: undefined,
      amount: 'Hello',
    });
    expect(service.getWalletPaymentParam(address, { amount: '33,44' })).toStrictEqual({
      address: 'x',
      currencyCode: undefined,
      amount: '33,44',
    });
    expect(service.getWalletPaymentParam(address, { amount: '1.2.3' })).toStrictEqual({
      address: 'x',
      currencyCode: undefined,
      amount: '1.2.3',
    });
  });

  it('should detect invalid currency', () => {
    expect(service.getCurrencyBySymbol('')).toBeUndefined();
    expect(service.getCurrencyBySymbol('x')).toBeUndefined();
    expect(service.getCurrencyBySymbol('Hello')).toBeUndefined();
    expect(service.getCurrencyBySymbol('128')).toBeUndefined();
  });

  it('should detect all valid currencies', () => {
    const currencies = service.getCurrencies();
    expect(currencies.length).toBeGreaterThan(0);

    for (let i = 0; i < currencies.length; i++) {
      const currency = currencies[i];

      expect(service.getCurrencyByCode(currency.code)?.code).toBe(currency.code);
      expect(service.getCurrencyBySymbol(currency.symbol)?.symbol).toBe(currency.symbol);

      const address = 'x';
      const amount = (i + 1) * 10;
      const paymentParam = service.getWalletPaymentParam(address, { amount: `${currency.symbol}${amount}` });

      expect(paymentParam.amount).toBe(amount.toString());
      expect(paymentParam.currencyCode).toBe(currency.code);
    }
  });

  it('should detect valid payment params', () => {
    const address = 'x';

    expect(() => service.walletPaymentParamCheck({ address, currencyCode: 'usd', amount: '1000' })).not.toThrow();
    expect(() => service.walletPaymentParamCheck({ address, currencyCode: 'eur', amount: '0.02' })).not.toThrow();
    expect(() => service.walletPaymentParamCheck({ address, currencyCode: 'chf', amount: '222.99' })).not.toThrow();
  });

  it('should detect invalid payment params', () => {
    const address = 'x';

    expect(() => service.walletPaymentParamCheck({ address, currencyCode: 'xyz', amount: '100' })).toThrow(
      'Unknown currency xyz',
    );

    expect(() => service.walletPaymentParamCheck({ address, currencyCode: 'usd', amount: 'xyz' })).toThrow(
      'USD amount xyz must be a number',
    );

    expect(() => service.walletPaymentParamCheck({ address, currencyCode: 'eur', amount: '0.0099' })).toThrow(
      'EUR amount 0.0099 is lower than min. 0.01',
    );

    expect(() => service.walletPaymentParamCheck({ address, currencyCode: 'chf', amount: '100001' })).toThrow(
      'CHF amount 100001 is higher than max. 10000',
    );
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
      'Pay this Lightning bill to transfer 100 CHF to TestLightningAddress. Alternatively, send 100 CHF to TestEVMPaymentAddress via Ethereum, Polygon, Arbitrum, Optimism or Base.',
    );
  });
});
