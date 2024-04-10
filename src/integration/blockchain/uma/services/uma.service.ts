import { BadRequestException, Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import {
  Currency,
  InMemoryNonceValidator,
  KycStatus,
  LnurlpRequest,
  LnurlpResponse,
  PayReqResponse,
  PayRequest,
  PubKeyResponse,
  getLnurlpResponse,
  getPayReqResponse,
  getPayRequest,
  getSignedLnurlpRequestUrl,
  parseLnurlpRequest,
  verifyPayReqSignature,
  verifyUmaLnurlpQuerySignature,
  verifyUmaLnurlpResponseSignature,
} from '@uma-sdk/core';
import { Config } from 'src/config/config';
import { HttpService } from 'src/shared/services/http.service';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { Util } from 'src/shared/utils/util';
import { LightningForwardService } from 'src/subdomains/lightning/services/lightning-forward.service';
import { LnBitsLnurlpInvoiceDto } from '../../lightning/dto/lnbits.dto';
import { LightningHelper } from '../../lightning/lightning-helper';
import { UmaClient } from '../uma-client';
import { CoinGeckoService } from './coingecko.service';

@Injectable()
export class UmaService implements OnModuleInit {
  private readonly logger = new LightningLogger(UmaService);

  private readonly umaClient: UmaClient;

  private nonceValidator: InMemoryNonceValidator;

  private currencyCache: Map<string, Currency>;

  constructor(
    readonly http: HttpService,
    private readonly lightningForwardService: LightningForwardService,
    private readonly coingeckoService: CoinGeckoService,
  ) {
    this.umaClient = new UmaClient(http);

    // InMemoryNonceValidator should not be used in production!
    this.nonceValidator = new InMemoryNonceValidator(1000);

    this.currencyCache = new Map();
  }

  // TODO: data will be provided via a database table in the next version
  onModuleInit() {
    this.currencyCache.set('usd', {
      symbol: 'USD',
      code: 'usd',
      name: 'US Dollar',
      minSendable: 1,
      maxSendable: 10_000_000,
      multiplier: 0,
      decimals: 2,
    });

    this.currencyCache.set('chf', {
      symbol: 'CHF',
      code: 'chf',
      name: 'Swiss Franc',
      minSendable: 1,
      maxSendable: 10_000_000,
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

  getDefaultClient(): UmaClient {
    return this.umaClient;
  }

  wellknownUmaPubKey(): PubKeyResponse {
    return {
      signingPubKey: Config.uma.signingPubKey,
      encryptionPubKey: Config.uma.encryptionPubKey,
    };
  }

  async createRequestUrl(receiverAddress: string): Promise<URL> {
    return getSignedLnurlpRequestUrl({
      isSubjectToTravelRule: true,
      receiverAddress: receiverAddress,
      signingPrivateKey: Util.stringToUint8(Config.uma.signingPrivKey, 'hex'),
      senderVaspDomain: Config.baseUrl,
    });
  }

  async sendRequest(url: URL): Promise<LnurlpResponse> {
    return this.umaClient.sendRequest(url.href);
  }

  async wellknownRequest(address: string, url: string): Promise<LnurlpResponse> {
    try {
      const umaUrl = new URL(url);

      // TODO: only for testing purposes, will be removed ...
      this.logger.info(umaUrl.toString());

      const senderVaspDomain = umaUrl.searchParams.get('vaspDomain');
      if (!senderVaspDomain) throw new Error('Cannot detect sender VASP domain');

      // TODO NEXT VERSION: VASP ID Authority
      // Validate the signing pubkey with TravelRule authority

      const umaQuery = parseLnurlpRequest(umaUrl);
      await this.checkLnurlpQuery(umaQuery, senderVaspDomain);

      return await this.createUmaResponse(address, senderVaspDomain, umaQuery);
    } catch (e) {
      if (e instanceof BadRequestException) throw e;

      this.logger.error(`Invalid lnurlp signature for address ${address} with url ${url}`, e);
      throw new BadRequestException('Invalid lnurlp signature');
    }
  }

  private async checkLnurlpQuery(umaQuery: any, senderVaspDomain: string): Promise<void> {
    const senderPubKey = await this.umaClient.getPublicKey(senderVaspDomain);

    const isLnurlpQueryValid = await verifyUmaLnurlpQuerySignature(
      umaQuery,
      Util.stringToUint8(senderPubKey.signingPubKey, 'hex'),
      this.nonceValidator,
    );

    if (!isLnurlpQueryValid) throw new BadRequestException('Invalid lnurlp signature');
  }

  private async createUmaResponse(
    address: string,
    senderVaspDomain: string,
    umaQuery: LnurlpRequest,
  ): Promise<LnurlpResponse> {
    try {
      const callback = `${Config.url}/uma/${address}?senderVaspDomain=${senderVaspDomain}`;
      const metadata = '[["text/plain", "Pay on lightning.space"]]';

      await this.updateCurrencyMultipliers();

      return await getLnurlpResponse({
        request: umaQuery,
        callback: callback,
        requiresTravelRuleInfo: true,
        encodedMetadata: metadata,
        minSendableSats: 1,
        maxSendableSats: 10000000000,
        privateKeyBytes: Util.stringToUint8(Config.uma.signingPrivKey, 'hex'),
        receiverKycStatus: KycStatus.Unknown,
        payerDataOptions: {
          identifier: { mandatory: false },
          name: { mandatory: false },
          email: { mandatory: false },
          compliance: { mandatory: false },
        },
        currencyOptions: [...this.currencyCache.values()],
      });
    } catch (e) {
      this.logger.error(`Failed to create lnurlp response for address ${address}`, e);
      throw new BadRequestException('Failed to create lnurlp response');
    }
  }

  private async updateCurrencyMultipliers(): Promise<void> {
    for (const currency of this.currencyCache.values()) {
      if (currency.code !== 'sat') {
        currency.multiplier = await this.getMultiplier(currency);
      }
    }
  }

  private async getMultiplier(currency: Currency): Promise<number> {
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

  async sendPayRequest(
    currencyCode: string,
    amount: number,
    senderAddress: string,
    receiverAddress: string,
    response: LnurlpResponse,
  ): Promise<PayReqResponse> {
    try {
      const receiverVaspDomain = receiverAddress.slice(receiverAddress.indexOf('@') + 1);

      const receiverPubKey = await this.checkResponse(receiverVaspDomain, response);

      const callback = response.callback;
      const currencies = response.currencies;

      const currency = currencies.find((c) => c.code.toLowerCase() === currencyCode.toLowerCase());
      if (!currency) throw new BadRequestException(`Unknown Currency ${currencyCode}`);

      const payAmount = amount * 10 ** currency.decimals;

      const payRequest = await getPayRequest({
        receiverEncryptionPubKey: Util.stringToUint8(receiverPubKey.encryptionPubKey, 'hex'),
        sendingVaspPrivateKey: Util.stringToUint8(Config.uma.signingPrivKey, 'hex'),
        currencyCode: currency.code,
        amount: payAmount,
        payerIdentifier: senderAddress,
        payerName: undefined,
        payerEmail: undefined,
        payerKycStatus: KycStatus.Unknown,
        travelRuleFormat: undefined,
        trInfo: undefined,
        payerNodePubKey: undefined,
        payerUtxos: undefined,
        utxoCallback: undefined,
      });

      return await this.umaClient.sendPayRequest(callback, payRequest);
    } catch (e) {
      if (e instanceof BadRequestException) throw e;

      this.logger.error(`Error sending pay request: ${senderAddress} to ${receiverAddress}`, e);
      throw new InternalServerErrorException('Error sending pay request');
    }
  }

  private async checkResponse(receiverVaspDomain: string, response: LnurlpResponse): Promise<PubKeyResponse> {
    const receiverPubKey = await this.umaClient.getPublicKey(receiverVaspDomain);

    // TODO NEXT VERSION: VASP ID Authority
    // Validate the pubkey with pubkey authority

    const isResponseValid = await verifyUmaLnurlpResponseSignature(
      response,
      Util.stringToUint8(receiverPubKey.signingPubKey, 'hex'),
      this.nonceValidator,
    );

    if (!isResponseValid) throw new BadRequestException('Invalid lnurlp response');

    return receiverPubKey;
  }

  async createPayRequestResponse(
    receiverAddress: string,
    receiverVaspDomain: string,
    payRequest: PayRequest,
  ): Promise<PayReqResponse> {
    try {
      await this.checkPayRequest(receiverVaspDomain, payRequest);

      const currencyCode = payRequest.currency;
      const currency = this.currencyCache.get(currencyCode);
      if (!currency) throw new BadRequestException(`Unknown currency ${currencyCode}`);

      const conversionRate = await this.getMultiplier(currency);

      const payReqResp = await getPayReqResponse({
        conversionRate: conversionRate,
        currencyCode: currencyCode,
        currencyDecimals: currency.decimals,
        invoiceCreator: this,
        metadata: `{"receiver":"${receiverAddress}"}`,
        query: payRequest,
        receiverChannelUtxos: [],
        receiverFeesMillisats: 1000,
        receiverNodePubKey: undefined,
        utxoCallback: undefined,
      });

      return payReqResp;
    } catch (e) {
      if (e instanceof BadRequestException) throw e;

      this.logger.error(`Failed to generate UMA response: ${receiverVaspDomain}`, e);
      throw new InternalServerErrorException('Failed to generate UMA response');
    }
  }

  private async checkPayRequest(receiverVaspDomain: string, payRequest: PayRequest): Promise<void> {
    const receiverPubKey = await this.umaClient.getPublicKey(receiverVaspDomain);

    const isPayRequestValid = await verifyPayReqSignature(
      payRequest,
      Util.stringToUint8(receiverPubKey.signingPubKey, 'hex'),
      this.nonceValidator,
    );

    if (!isPayRequestValid) throw new BadRequestException('Invalid pay request signature');
  }

  // Function is called via the "invoiceCreator" interface
  async createUmaInvoice(amountMsats: number, metadata: string): Promise<string | undefined> {
    const receiverMetadata = metadata.slice(0, metadata.indexOf('}{') + 1);
    const receiverMetadataAsJson = JSON.parse(receiverMetadata);
    const lnReceiverAddress = (<string>receiverMetadataAsJson.receiver).replace('$', '');

    const lnUrlpId = await this.lightningForwardService.getLnurlpId(lnReceiverAddress);

    return this.lightningForwardService.lnurlpCallbackForward(lnUrlpId, { amount: amountMsats }).then((i) => i.pr);
  }

  async finishPayment(payRequestReponse: PayReqResponse): Promise<void> {
    // TODO NEXT VERSION: Compliance Provider
    // Pre-screen register deposit addresses for public channel UTXOs
    // and/or shared UTXOs from LNURL-pay GET operation

    // TODO:
    // Convert from sender currency to SATs
    //const inputAmount = 1; // 1 cent
    //const conversionRate = LightningHelper.btcToSat(0.01 / (await this.getPriceInBTC('usd')));
    //const amountToSpend = inputAmount * conversionRate;

    this.logger.info(`Invoice: ${payRequestReponse.pr}`);

    // TODO: LN
    // Send payment after user confirmation
  }

  async createAssetInvoice(address: string, asset: string, amount: number): Promise<LnBitsLnurlpInvoiceDto> {
    const currency = this.currencyCache.get(asset);
    if (!currency) throw new BadRequestException(`Unknown asset ${asset}`);

    const conversionRate = await this.getMultiplier(currency);
    const payAmount = amount * 10 ** currency.decimals * conversionRate;

    const lnUrlpId = await this.lightningForwardService.getLnurlpId(address);

    return this.lightningForwardService.lnurlpCallbackForward(lnUrlpId, { amount: payAmount });
  }
}
