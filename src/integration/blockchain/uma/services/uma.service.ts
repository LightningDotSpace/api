import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import {
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
import { LightningHelper } from '../../lightning/lightning-helper';
import { UmaClient } from '../uma-client';
import { CoinGeckoService } from './coingecko.service';

@Injectable()
export class UmaService {
  private readonly logger = new LightningLogger(UmaService);

  private readonly umaClient: UmaClient;

  private nonceValidator: InMemoryNonceValidator;

  constructor(
    readonly http: HttpService,
    private readonly lightningForwardService: LightningForwardService,
    private readonly coingeckoService: CoinGeckoService,
  ) {
    this.umaClient = new UmaClient(http);

    // InMemoryNonceValidator should not be used in production!
    this.nonceValidator = new InMemoryNonceValidator(1000);
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
      const metadata = '[["text/plain", "Pay on VASP1"]]';

      const usdMultiplier = LightningHelper.btcToMsat(0.01 / (await this.getPriceInBTC('usd')));
      const chfMultiplier = LightningHelper.btcToMsat(0.01 / (await this.getPriceInBTC('chf')));

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
        currencyOptions: [
          {
            symbol: 'USD',
            code: 'usd',
            name: 'US Dollar',
            minSendable: 1,
            maxSendable: 10_000_000,
            multiplier: usdMultiplier,
            decimals: 2,
          },
          {
            symbol: 'CHF',
            code: 'chf',
            name: 'Swiss Franc',
            minSendable: 1,
            maxSendable: 10_000_000,
            multiplier: chfMultiplier,
            decimals: 2,
          },
          {
            symbol: 'SAT',
            code: 'sat',
            name: 'Satoshi',
            minSendable: 1,
            maxSendable: 10_000_000_000,
            multiplier: 1000,
            decimals: 0,
          },
        ],
      });
    } catch (e) {
      this.logger.error(`Failed to create lnurlp response for address ${address}`, e);
      throw new BadRequestException('Failed to create lnurlp response');
    }
  }

  private async getPriceInBTC(from: string): Promise<number> {
    //const price = await this.coingeckoService.getPrice(from, 'btc');
    //if (!price.isValid) throw new InternalServerErrorException(`Invalid price from ${from} to btc`);

    //return price.price;
    return from === 'usd' ? 66500 : 62500;
  }

  async sendPayRequest(
    senderAddress: string,
    receiverAddress: string,
    response: LnurlpResponse,
  ): Promise<PayReqResponse> {
    try {
      const receiverVaspDomain = receiverAddress.slice(receiverAddress.indexOf('@') + 1);

      await this.checkResponse(receiverVaspDomain, response);

      const callback = response.callback;
      const currencies = response.currencies;

      // TODO:
      // Hier muss eine Auswahl der Währung und der Menge erfolgen
      const currency = currencies[0];
      const amount = 1; // 1 cent

      const receiverPubKey = await this.umaClient.getPublicKey(receiverVaspDomain);

      const payRequest = await getPayRequest({
        receiverEncryptionPubKey: Util.stringToUint8(receiverPubKey.encryptionPubKey, 'hex'),
        sendingVaspPrivateKey: Util.stringToUint8(Config.uma.signingPrivKey, 'hex'),
        currencyCode: currency.code,
        amount: amount,
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

  private async checkResponse(receiverVaspDomain: string, response: LnurlpResponse): Promise<void> {
    const receiverPubKey = await this.umaClient.getPublicKey(receiverVaspDomain);

    // TODO NEXT VERSION: VASP ID Authority
    // Validate the pubkey with pubkey authority

    const isResponseValid = await verifyUmaLnurlpResponseSignature(
      response,
      Util.stringToUint8(receiverPubKey.signingPubKey, 'hex'),
      this.nonceValidator,
    );

    if (!isResponseValid) throw new BadRequestException('Invalid lnurlp response');
  }

  async createPayRequestResponse(
    receiverAddress: string,
    receiverVaspDomain: string,
    payRequest: PayRequest,
  ): Promise<PayReqResponse> {
    try {
      await this.checkPayRequest(receiverVaspDomain, payRequest);

      // TODO: get the smallest unit of the currency, e.g. 0.01 for USD
      const conversionRate = LightningHelper.btcToMsat(0.01 / (await this.getPriceInBTC(payRequest.currency)));

      const payReqResp = await getPayReqResponse({
        conversionRate: conversionRate,
        currencyCode: payRequest.currency,
        currencyDecimals: 2,
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

    const lnPayRequest = await this.lightningForwardService.wellknownForward(lnReceiverAddress);
    const lnCallback = lnPayRequest.callback;
    const lnUrlpId = lnCallback.slice(lnCallback.lastIndexOf('/') + 1);

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
}
