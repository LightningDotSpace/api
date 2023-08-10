import { Agent } from 'https';
import { Config } from 'src/config/config';
import { HttpRequestConfig, HttpService } from 'src/shared/services/http.service';
import {
  LnBitsLnurlpLinkDto,
  LnBitsLnurlpLinkRemoveDto,
  LnBitsUsermanagerWalletDto,
  LnBitsWalletDto,
  LnbitsUsermanagerUserDto,
} from './dto/lnbits.dto';
import { LndInfoDto } from './dto/lnd.dto';
import { LightningHelper } from './lightning-helper';

interface UserFilterData {
  userId?: string;
  username?: string;
}

export class LightningClient {
  constructor(private readonly http: HttpService) {}

  // --- LND --- //
  async getLndInfo(): Promise<LndInfoDto> {
    return this.http.get<LndInfoDto>(`${Config.blockchain.lightning.lnd.apiUrl}/getinfo`, this.httpLndConfig());
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

    if (userFilter?.userId) params['id[eq]'] = userFilter?.userId;
    if (userFilter?.username) params['name[eq]'] = userFilter?.username;

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

  async getUserWallets(userFilter?: UserFilterData): Promise<LnBitsUsermanagerWalletDto[]> {
    if (!userFilter) {
      return this.http
        .get<LnBitsUsermanagerWalletDto[]>(
          `${Config.blockchain.lightning.lnbits.usermanagerApiUrl}/wallets`,
          this.httpLnBitsConfig(Config.blockchain.lightning.lnbits.adminKey),
        )
        .then((w) => this.fillWalletBalance(w));
    }

    const userWallets: LnBitsUsermanagerWalletDto[] = [];

    const users = await this.getUsers(userFilter);

    for (const user of users) {
      userWallets.push(...(await this.getUserWalletsByUserId(user.id).then((w) => this.fillWalletBalance(w))));
    }

    return userWallets;
  }

  private async getUserWalletsByUserId(userId: string): Promise<LnBitsUsermanagerWalletDto[]> {
    return this.http.get<LnBitsUsermanagerWalletDto[]>(
      `${Config.blockchain.lightning.lnbits.usermanagerApiUrl}/wallets/${userId}`,
      this.httpLnBitsConfig(Config.blockchain.lightning.lnbits.adminKey),
    );
  }

  private async fillWalletBalance(userWallets: LnBitsUsermanagerWalletDto[]): Promise<LnBitsUsermanagerWalletDto[]> {
    for (const userWallet of userWallets) {
      const lnbitsWallet = await this.getLnBitsWallet(userWallet.adminkey);
      userWallet.balance = lnbitsWallet.balance;
    }

    return userWallets;
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

  async createLnurlpLink(adminKey: string, description: string, username: string): Promise<LnBitsLnurlpLinkDto> {
    if (!description) throw new Error('Description is undefined');

    const newLnurlpLinkDto: LnBitsLnurlpLinkDto = {
      description: description,
      min: 100,
      max: 100000000,
      comment_chars: 0,
      fiat_base_multiplier: 100,
      username: username,
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

  // --- HELPER METHODS --- //
  private httpLnBitsConfig(adminKey: string, params?: any): HttpRequestConfig {
    return {
      httpsAgent: new Agent({
        ca: Config.blockchain.lightning.certificate,
      }),
      params: { 'api-key': adminKey, ...params },
    };
  }

  private httpLndConfig(): HttpRequestConfig {
    return {
      httpsAgent: new Agent({
        ca: Config.blockchain.lightning.certificate,
      }),

      headers: { 'Grpc-Metadata-macaroon': Config.blockchain.lightning.lnd.adminMacaroon },
    };
  }
}
