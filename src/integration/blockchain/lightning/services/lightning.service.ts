import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Config } from 'src/config/config';
import { HttpService } from 'src/shared/services/http.service';
import { LnBitsUserDto, LnBitsUsermanagerWalletDto, LnBitsWalletDto } from '../dto/lnbits.dto';
import { LightningClient, UserFilterData } from '../lightning-client';
import { LightningHelper } from '../lightning-helper';

@Injectable()
export class LightningService {
  private readonly client: LightningClient;

  constructor(private readonly http: HttpService) {
    this.client = new LightningClient(http);
  }

  getDefaultClient(): LightningClient {
    return this.client;
  }

  async createUser(address: string): Promise<LnBitsUserDto> {
    const users = await this.client.getUsers({ username: address });
    if (users.length) throw new ConflictException(`User ${address} already exists`);

    const walletname = 'BTC';
    const lnurlpDescription = 'BTC Payment';

    const user = await this.client.createUser(address, walletname);
    if (!user.wallets) throw new NotFoundException('Wallet not found');

    const lnbitsAddress = LightningHelper.createLnbitsAddress(address);

    const signMessage = await this.getSignMessage(LightningHelper.getLightningAddressAsLnurl(lnbitsAddress));
    const lnbitsAddressSignature = await this.client.signMessage(signMessage);

    const wallet = user.wallets[0];
    const lnurlp = await this.client.createLnurlpLink(wallet.adminkey, lnurlpDescription, 1, 100000000);

    const lnbitsUser: LnBitsUserDto = {
      id: user.id,
      name: user.name,
      address: lnbitsAddress,
      addressSignature: lnbitsAddressSignature,
      wallets: [
        {
          wallet: wallet,
          lnurlp: lnurlp,
        },
      ],
    };

    const assets = ['USD', 'CHF', 'EUR'];

    for (const asset of assets) {
      const assetWallet = await this.client.createUserWallet(user.id, asset);
      const assetPaylink = await this.client.createLnurlpLink(assetWallet.adminkey, asset + ' Payment', 1, 100000000);

      lnbitsUser.wallets.push({
        wallet: assetWallet,
        lnurlp: assetPaylink,
      });
    }

    return lnbitsUser;
  }

  async getSignMessage(address: string): Promise<string> {
    return this.http
      .get<{ message: string }>(`${Config.dfxApiUrl}/auth/signMessage`, {
        params: { address: address },
      })
      .then((m) => m.message);
  }

  async removeUser(userFilter: UserFilterData): Promise<boolean> {
    const users = await this.client.getUsers(userFilter);

    if (users.length) {
      const allWallets = await this.client.getUserWallets();

      for (const user of users) {
        const wallets = allWallets.filter((w) => w.user === user.id);

        for (const wallet of wallets) {
          const adminKey = wallet.adminkey;
          await this.removeLnurlp(adminKey, wallet.id);
        }

        await this.client.removeUser(user.id);
      }
    }

    return true;
  }

  private async removeLnurlp(adminKey: string, walletId: string) {
    const lnurlpLinks = await this.client.getLnurlpLinks(adminKey);

    for (const lnurlpLink of lnurlpLinks) {
      if (walletId === lnurlpLink.wallet && lnurlpLink.id) {
        await this.client.removeLnurlpLink(adminKey, lnurlpLink.id);
      }
    }
  }

  async getLnBitsWallets(): Promise<LnBitsWalletDto[]> {
    const lnbitsWallets: LnBitsWalletDto[] = [];

    lnbitsWallets.push(await this.client.getLnBitsWallet(Config.blockchain.lightning.lnbits.adminKey));
    lnbitsWallets.push(...(await this.client.getUserWallets().then((w) => this.convertToLnbitsWallets(w))));

    return lnbitsWallets;
  }

  private convertToLnbitsWallets(userWallets: LnBitsUsermanagerWalletDto[]): LnBitsWalletDto[] {
    const lnbitsWallets: LnBitsWalletDto[] = [];

    for (const userWallet of userWallets) {
      lnbitsWallets.push({
        id: userWallet.id,
        name: userWallet.name,
        balance: userWallet.balance,
        adminkey: userWallet.adminkey,
      });
    }

    return lnbitsWallets;
  }
}
