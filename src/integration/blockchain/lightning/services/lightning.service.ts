import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Config } from 'src/config/config';
import { HttpService } from 'src/shared/services/http.service';
import { Util } from 'src/shared/utils/util';
import { LnUserInfoDto } from '../dto/ln-userinfo.dto';
import { LnBitsUserDto, LnBitsUsermanagerWalletDto, LnBitsWalletDto } from '../dto/lnbits.dto';
import { LightningClient } from '../lightning-client';

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
    const addressHash = Util.createHash(address, 'sha256', 'hex');
    const username = addressHash.slice(0, 6);
    const walletname = `${username} wallet`;
    const lnurlpDescription = `${username} lnurlp`;

    const users = await this.client.getUsers({ username: username });
    if (users.length) throw new ConflictException(`User ${username} already exists`);

    const user = await this.client.createUser(username, walletname);
    if (!user.wallets) throw new NotFoundException('Wallet not found');

    const wallet = user.wallets[0];

    const lnurlp = await this.client.createLnurlpLink(wallet.adminkey, lnurlpDescription, username);

    return {
      user: {
        id: user.id,
        name: user.name,
      },
      wallet: {
        id: wallet.id,
        name: wallet.name,
        adminkey: wallet.adminkey,
        inkey: wallet.inkey,
      },
      lnurlp: {
        id: lnurlp.id || '',
        description: lnurlp.description,
        username: lnurlp.username || '',
      },
    };
  }

  async removeUser(address: string): Promise<boolean> {
    const addressHash = Util.createHash(address, 'sha256', 'hex');
    const username = addressHash.slice(0, 6);

    const users = await this.client.getUsers({ username: username });

    if (users) {
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

  async getUserInfo(userId: string): Promise<LnUserInfoDto> {
    const usersWithWallets = await this.client.getUsersWithWallets({ userId: userId });
    if (1 != usersWithWallets.length) throw new NotFoundException('User Wallet mismatch');

    const userWithWallets = usersWithWallets[0];
    const userWallets = userWithWallets.wallets;
    if (!userWallets || 1 != userWallets.length) throw new NotFoundException('User Wallet not found');
    const userWallet = userWallets[0];

    return {
      address: `${userWithWallets.name}@${Config.url}`,
      adminKey: userWallet.adminkey,
      invoiceKey: userWallet.inkey,
      lndhubUrl: `lndhub://invoice:${userWallet.inkey}@${Config.blockchain.lightning.lnbits.lndhubUrl}`,
    };
  }

  async getLnBitsWallets(): Promise<LnBitsWalletDto[]> {
    const lnbitsWallets: LnBitsWalletDto[] = [];

    lnbitsWallets.push(await this.client.getLnBitsWallet(Config.blockchain.lightning.lnbits.adminKey));
    lnbitsWallets.push(...(await this.client.getUserWallets().then(this.convertToLnbitsWallets)));

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
