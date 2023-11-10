import { HttpException } from '@nestjs/common';
import { IncomingHttpHeaders } from 'http';
import { Agent } from 'https';
import { Config } from 'src/config/config';
import { HttpRequestConfig, HttpService } from 'src/shared/services/http.service';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { Util } from 'src/shared/utils/util';
import {
  LnBitsLnurlPayRequestDto,
  LnBitsLnurlWithdrawRequestDto,
  LnBitsLnurlpInvoiceDto,
  LnBitsLnurlpLinkDto,
  LnBitsLnurlpLinkRemoveDto,
  LnBitsLnurlwInvoiceDto,
  LnBitsLnurlwLinkDto,
  LnBitsTransactionDto,
  LnBitsUsermanagerWalletDto,
  LnBitsWalletDto,
  LnbitsUsermanagerUserDto,
} from './dto/lnbits.dto';
import {
  LndChannelBalanceDto,
  LndChannelDto,
  LndInfoDto,
  LndInvoiceResponseDto,
  LndOnchainTransactionDto,
  LndPaymentResponseDto,
  LndRoutingDto,
  LndRoutingResponseDto,
  LndTransactionDto,
  LndTransactionResponseDto,
  LndWalletBalanceDto,
} from './dto/lnd.dto';
import { LightningHelper } from './lightning-helper';

export interface UserFilterData {
  userId?: string;
  username?: string;
}
export interface LndhubParameterData {
  method: string;
  headers: IncomingHttpHeaders;
  lastUrlpart: string;
  body?: any;
  params?: any;
}

export class LightningClient {
  private readonly logger = new LightningLogger(LightningClient);

  constructor(private readonly http: HttpService) {}

  // --- LND --- //
  async getLndInfo(): Promise<LndInfoDto> {
    return this.http.get<LndInfoDto>(`${Config.blockchain.lightning.lnd.apiUrl}/getinfo`, this.httpLndConfig());
  }

  async signMessage(message: string): Promise<string> {
    return this.http
      .post<{ signature: string }>(
        `${Config.blockchain.lightning.lnd.apiUrl}/signmessage`,
        { msg: Buffer.from(message, 'ascii').toString('base64') },
        this.httpLndConfig(),
      )
      .then((s) => s.signature);
  }

  async getLndConfirmedWalletBalance(): Promise<number> {
    return this.getLndWalletBalance().then((b) => b.confirmed_balance);
  }

  private async getLndWalletBalance(): Promise<LndWalletBalanceDto> {
    return this.http.get<LndWalletBalanceDto>(
      `${Config.blockchain.lightning.lnd.apiUrl}/balance/blockchain`,
      this.httpLndConfig(),
    );
  }

  async getLndLocalChannelBalance(): Promise<number> {
    return this.getLndChannelBalance().then((b) => b.local_balance.sat);
  }

  async getLndRemoteChannelBalance(): Promise<number> {
    return this.getLndChannelBalance().then((b) => b.remote_balance.sat);
  }

  private async getLndChannelBalance(): Promise<LndChannelBalanceDto> {
    return this.http.get<LndChannelBalanceDto>(
      `${Config.blockchain.lightning.lnd.apiUrl}/balance/channels`,
      this.httpLndConfig(),
    );
  }

  async getLndLightningBalance(): Promise<number> {
    const balances = (await this.getChannels()).map((c) => Number(c.local_balance));

    return Util.sum(balances);
  }

  private async getChannels(): Promise<LndChannelDto[]> {
    return this.http
      .get<{ channels: LndChannelDto[] }>(`${Config.blockchain.lightning.lnd.apiUrl}/channels`, this.httpLndConfig())
      .then((r) => r.channels);
  }

  async getOnchainTransactions(blockHeightStart: number, blockHeightEnd?: number): Promise<LndOnchainTransactionDto[]> {
    const params = {
      start_height: blockHeightStart,
      end_height: blockHeightEnd,
    };

    return this.http
      .get<{ transactions: LndOnchainTransactionDto[] }>(
        `${Config.blockchain.lightning.lnd.apiUrl}/transactions`,
        this.httpLndConfig(params),
      )
      .then((t) => t.transactions);
  }

  async getInvoices(
    maxInvoices: number,
    offset: number,
    creationDateStart: Date,
    creationDateEnd?: Date,
  ): Promise<LndTransactionResponseDto> {
    const params = {
      num_max_invoices: maxInvoices.toString(),
      index_offset: offset.toString(),
      pending_only: false,
      reversed: false,
      creation_date_start: Math.floor(creationDateStart.getTime() / 1000).toString(),
      creation_date_end: creationDateEnd ? Math.floor(creationDateEnd.getTime() / 1000).toString() : undefined,
    };

    return this.http
      .get<LndInvoiceResponseDto>(`${Config.blockchain.lightning.lnd.apiUrl}/invoices`, this.httpLndConfig(params))
      .then((r) => this.mapInvoiceResponse(r));
  }

  private mapInvoiceResponse(invoiceResponse: LndInvoiceResponseDto): LndTransactionResponseDto {
    return {
      transactions: invoiceResponse.invoices.map((i) => ({
        state: i.state,
        transaction: Buffer.from(i.r_hash, 'base64').toString('hex'),
        secret: Buffer.from(i.r_preimage, 'base64').toString('hex'),
        amount: Number(i.value),
        fee: 0,
        creationTimestamp: new Date(Number(i.creation_date) * 1000),
        expiresTimestamp: new Date((Number(i.creation_date) + Number(i.expiry)) * 1000),
        confirmedTimestamp: '0' === i.settle_date ? undefined : new Date(Number(i.settle_date) * 1000),
        description: i.memo,
        paymentRequest: i.payment_request,
      })),
      last_index_offset: Number(invoiceResponse.last_index_offset),
    };
  }

  async getPayments(
    maxPayments: number,
    offset: number,
    creationDateStart: Date,
    creationDateEnd?: Date,
  ): Promise<LndTransactionResponseDto> {
    const params = {
      include_incomplete: true,
      max_payments: maxPayments.toString(),
      index_offset: offset.toString(),
      creation_date_start: Math.floor(creationDateStart.getTime() / 1000).toString(),
      creation_date_end: creationDateEnd ? Math.floor(creationDateEnd.getTime() / 1000).toString() : undefined,
    };

    return this.http
      .get<LndPaymentResponseDto>(`${Config.blockchain.lightning.lnd.apiUrl}/payments`, this.httpLndConfig(params))
      .then((r) => this.mapPaymentResponse(r));
  }

  private mapPaymentResponse(paymentResponse: LndPaymentResponseDto): LndTransactionResponseDto {
    return {
      transactions: paymentResponse.payments.map((p) => ({
        state: p.status,
        transaction: p.payment_hash,
        secret: p.payment_preimage,
        amount: -Number(p.value_sat),
        fee: -Number(p.fee_sat),
        creationTimestamp: new Date(Number(p.creation_time_ns) / 1000000),
        reason: p.failure_reason,
        paymentRequest: p.payment_request,
      })),
      last_index_offset: Number(paymentResponse.last_index_offset),
    };
  }

  async getRoutings(
    maxRoutings: number,
    offset: number,
    startTime: Date,
    endTime?: Date,
  ): Promise<LndTransactionResponseDto> {
    return this.http
      .post<LndRoutingResponseDto>(
        `${Config.blockchain.lightning.lnd.apiUrl}/switch`,
        {
          start_time: Math.floor(startTime.getTime() / 1000).toString(),
          end_time: endTime ? Math.floor(endTime.getTime() / 1000).toString() : undefined,
          num_max_events: maxRoutings.toString(),
          index_offset: offset.toString(),
        },
        this.httpLndConfig(),
      )
      .then((r) => this.mapRoutingResponse(r));
  }

  private mapRoutingResponse(routingResponse: LndRoutingResponseDto): LndTransactionResponseDto {
    return {
      transactions: routingResponse.forwarding_events.map((r) => this.createRoutingTransaction(r)).flat(),
      last_index_offset: routingResponse.last_offset_index,
    };
  }

  private createRoutingTransaction(routing: LndRoutingDto): LndTransactionDto[] {
    const state = 'SUCCEEDED';
    const transaction = Buffer.from(Util.createRandomHash(32), 'base64').toString('hex');
    const secret = '0000000000000000000000000000000000000000000000000000000000000000';
    const creationTimestamp = new Date(Number(routing.timestamp_ns) / 1000000);

    const transactionIn: LndTransactionDto = {
      state: state,
      transaction: transaction,
      secret: secret,
      amount: Number(routing.amt_in_msat) / 1000,
      fee: 0,
      creationTimestamp: creationTimestamp,
    };

    const transactionOut: LndTransactionDto = {
      state: state,
      transaction: transaction,
      secret: secret,
      amount: -Number(routing.amt_out_msat) / 1000,
      fee: -Number(routing.fee_msat) / 1000,
      creationTimestamp: creationTimestamp,
    };

    return [transactionIn, transactionOut];
  }

  // --- LNbits --- //
  async getLnBitsWallet(adminKey: string): Promise<LnBitsWalletDto> {
    return this.http
      .get<LnBitsWalletDto>(`${Config.blockchain.lightning.lnbits.apiUrl}/wallet`, this.httpLnBitsConfig(adminKey))
      .then((w) => this.fillLnBitsWallet(adminKey, w));
  }

  private fillLnBitsWallet(adminKey: string, lnbitsWallet: LnBitsWalletDto): LnBitsWalletDto {
    lnbitsWallet.adminkey = adminKey;
    lnbitsWallet.balance = LightningHelper.msatToBtc(lnbitsWallet.balance);

    return lnbitsWallet;
  }

  async createUser(username: string, walletname: string): Promise<LnbitsUsermanagerUserDto> {
    return this.http.post<LnbitsUsermanagerUserDto>(
      `${Config.blockchain.lightning.lnbits.usermanagerApiUrl}/users`,
      {
        user_name: username,
        wallet_name: walletname,
        admin_id: Config.blockchain.lightning.lnbits.adminUserId,
      },
      this.httpLnBitsConfig(Config.blockchain.lightning.lnbits.adminKey),
    );
  }

  async getUsers(userFilter?: UserFilterData): Promise<LnbitsUsermanagerUserDto[]> {
    const params = {};

    if (userFilter?.userId) params['id[eq]'] = userFilter.userId;
    if (userFilter?.username) params['name[eq]'] = userFilter.username;

    return this.http.get<LnbitsUsermanagerUserDto[]>(
      `${Config.blockchain.lightning.lnbits.usermanagerApiUrl}/users`,
      this.httpLnBitsConfig(Config.blockchain.lightning.lnbits.adminKey, params),
    );
  }

  async getUsersWithWallets(userFilter?: UserFilterData): Promise<LnbitsUsermanagerUserDto[]> {
    return this.getUsers(userFilter).then((u) => this.addWallets(u));
  }

  private async addWallets(users: LnbitsUsermanagerUserDto[]): Promise<LnbitsUsermanagerUserDto[]> {
    for (const user of users) {
      user.wallets = await this.getUserWalletsByUserId(user.id);
    }

    return users;
  }

  async createUserWallet(userId: string, walletname: string): Promise<LnBitsUsermanagerWalletDto> {
    return this.http.post<LnBitsUsermanagerWalletDto>(
      `${Config.blockchain.lightning.lnbits.usermanagerApiUrl}/wallets`,
      {
        user_id: userId,
        wallet_name: walletname,
        admin_id: Config.blockchain.lightning.lnbits.adminUserId,
      },
      this.httpLnBitsConfig(Config.blockchain.lightning.lnbits.adminKey),
    );
  }

  async getUserWallets(userFilter?: UserFilterData): Promise<LnBitsUsermanagerWalletDto[]> {
    if (!userFilter) {
      return this.http.get<LnBitsUsermanagerWalletDto[]>(
        `${Config.blockchain.lightning.lnbits.usermanagerApiUrl}/wallets`,
        this.httpLnBitsConfig(Config.blockchain.lightning.lnbits.adminKey),
      );
    }

    const userWallets: LnBitsUsermanagerWalletDto[] = [];

    const users = await this.getUsers(userFilter);

    for (const user of users) {
      userWallets.push(...(await this.getUserWalletsByUserId(user.id)));
    }

    return userWallets;
  }

  private async getUserWalletsByUserId(userId: string): Promise<LnBitsUsermanagerWalletDto[]> {
    return this.http.get<LnBitsUsermanagerWalletDto[]>(
      `${Config.blockchain.lightning.lnbits.usermanagerApiUrl}/wallets/${userId}`,
      this.httpLnBitsConfig(Config.blockchain.lightning.lnbits.adminKey),
    );
  }

  async getUserWalletTransactions(walletId: string): Promise<LnBitsTransactionDto[]> {
    return this.http.get<LnBitsTransactionDto[]>(
      `${Config.blockchain.lightning.lnbits.usermanagerApiUrl}/transactions/${walletId}`,
      this.httpLnBitsConfig(Config.blockchain.lightning.lnbits.adminKey),
    );
  }

  async removeUser(userId: string): Promise<void> {
    return this.http.delete<void>(
      `${Config.blockchain.lightning.lnbits.usermanagerApiUrl}/users/${userId}?delete_core=true`,
      this.httpLnBitsConfig(Config.blockchain.lightning.lnbits.adminKey),
    );
  }

  async getLnurlpLinks(adminKey: string): Promise<LnBitsLnurlpLinkDto[]> {
    return this.http.get<LnBitsLnurlpLinkDto[]>(
      `${Config.blockchain.lightning.lnbits.lnurlpApiUrl}/links?all_wallets=true`,
      this.httpLnBitsConfig(adminKey),
    );
  }

  async createLnurlpLink(
    adminKey: string,
    description: string,
    min: number,
    max: number,
  ): Promise<LnBitsLnurlpLinkDto> {
    if (!description) throw new Error('Description is undefined');

    const newLnurlpLinkDto: LnBitsLnurlpLinkDto = {
      description: description,
      min: min,
      max: max,
      comment_chars: 799,
      fiat_base_multiplier: 100,
    };

    return this.http.post<LnBitsLnurlpLinkDto>(
      `${Config.blockchain.lightning.lnbits.lnurlpApiUrl}/links`,
      newLnurlpLinkDto,
      this.httpLnBitsConfig(adminKey),
    );
  }

  async removeLnurlpLink(adminKey: string, linkId: string): Promise<boolean> {
    return this.doRemoveLnurlpLink(adminKey, linkId).then((r) => r.success);
  }

  private async doRemoveLnurlpLink(adminKey: string, linkId: string): Promise<LnBitsLnurlpLinkRemoveDto> {
    return this.http.delete<LnBitsLnurlpLinkRemoveDto>(
      `${Config.blockchain.lightning.lnbits.lnurlpApiUrl}/links/${linkId}`,
      this.httpLnBitsConfig(adminKey),
    );
  }

  // --- LNDHUB --- //
  async lndhubRequest(paramData: LndhubParameterData): Promise<any> {
    return this.http.request<any>(this.httpLnBitsLndHubConfig(paramData)).catch((e) => this.throwHttpException(e));
  }

  private httpLnBitsLndHubConfig(paramData: LndhubParameterData): HttpRequestConfig {
    return {
      url: `${Config.blockchain.lightning.lnbits.lndhubUrl}/${paramData.lastUrlpart}`,
      method: paramData.method,
      data: paramData.body,
      httpsAgent: new Agent({
        ca: Config.blockchain.lightning.certificate,
      }),
      headers: {
        Authorization: paramData.headers.authorization,
      },
      params: paramData.params,
    };
  }

  // --- LNURLp REWRITE --- //
  async getLnurlpPaymentRequest(linkId: string): Promise<LnBitsLnurlPayRequestDto> {
    const lnBitsUrl = `${Config.blockchain.lightning.lnbits.lnurlpUrl}/${linkId}`;
    return this.http
      .get<LnBitsLnurlPayRequestDto>(lnBitsUrl, this.httpLnBitsConfig(Config.blockchain.lightning.lnbits.adminKey))
      .catch((e) => this.throwHttpException(e));
  }

  async getLnurlpInvoice(linkId: string, params: any): Promise<LnBitsLnurlpInvoiceDto> {
    const lnBitsCallbackUrl = `${Config.blockchain.lightning.lnbits.lnurlpApiUrl}/lnurl/cb/${linkId}`;
    return this.http
      .get<LnBitsLnurlpInvoiceDto>(
        lnBitsCallbackUrl,
        this.httpLnBitsConfig(Config.blockchain.lightning.lnbits.adminKey, params),
      )
      .catch((e) => this.throwHttpException(e));
  }

  // --- LNURLw REWRITE --- //
  async getLnurlwWithdrawRequest(linkId: string): Promise<LnBitsLnurlWithdrawRequestDto> {
    const { unique_hash } = await this.getLnurlwLink(linkId);

    const lnBitsUrl = `${Config.blockchain.lightning.lnbits.lnurlwApiUrl}/lnurl/${unique_hash}`;
    return this.http.get(lnBitsUrl, this.httpLnBitsConfig(Config.blockchain.lightning.lnbits.adminKey));
  }

  async sendLnurlwInvoice(linkId: string, params: any): Promise<LnBitsLnurlwInvoiceDto> {
    const { unique_hash } = await this.getLnurlwLink(linkId);

    const lnBitsCallbackUrl = `${Config.blockchain.lightning.lnbits.lnurlwApiUrl}/lnurl/cb/${unique_hash}`;
    return this.http.get<LnBitsLnurlwInvoiceDto>(lnBitsCallbackUrl, this.httpLnBitsConfig(params));
  }

  // --- LNURLw LINKS --- //
  async getLnurlwLink(linkId: string): Promise<LnBitsLnurlwLinkDto> {
    return this.http.get<LnBitsLnurlwLinkDto>(
      `${Config.blockchain.lightning.lnbits.lnurlwApiUrl}/links/${linkId}`,
      this.httpLnBitsConfig(Config.blockchain.lightning.lnbits.adminKey),
    );
  }

  // --- HELPER METHODS --- //
  private httpLnBitsConfig(adminKey: string, params?: any): HttpRequestConfig {
    return {
      httpsAgent: new Agent({
        ca: Config.blockchain.lightning.certificate,
      }),
      params: { 'api-key': adminKey, ...params },
    };
  }

  private httpLndConfig(params?: any): HttpRequestConfig {
    return {
      httpsAgent: new Agent({
        ca: Config.blockchain.lightning.certificate,
      }),

      headers: { 'Grpc-Metadata-macaroon': Config.blockchain.lightning.lnd.adminMacaroon },
      params: params,
    };
  }

  throwHttpException(e: any): any {
    this.logger.error(e);
    throw new HttpException(e.response.data, e.response.status);
  }
}
