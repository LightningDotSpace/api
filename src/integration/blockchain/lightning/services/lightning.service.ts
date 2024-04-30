import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Currency } from '@uma-sdk/core';
import { Config } from 'src/config/config';
import { LightningCurrencyService } from 'src/integration/blockchain/lightning/services/lightning-currency.service';
import { Blockchain, blockchainFindBy } from 'src/shared/enums/blockchain.enum';
import { HttpService } from 'src/shared/services/http.service';
import { LightingWalletPaymentParamDto } from 'src/subdomains/lightning/dto/lightning-wallet.dto';
import { PaymentRequestService } from 'src/subdomains/payment-request/services/payment-request.service';
import { LightningWalletEntity } from 'src/subdomains/user/domain/entities/lightning-wallet.entity';
import { LnBitsLnurlpInvoiceDto, LnBitsUserDto } from '../dto/lnbits.dto';
import { LightningClient, UserFilterData } from '../lightning-client';
import { LightningHelper } from '../lightning-helper';

@Injectable()
export class LightningService {
  private readonly client: LightningClient;

  constructor(
    private readonly http: HttpService,
    private readonly lightningCurrencyService: LightningCurrencyService,
    private readonly paymentRequestService: PaymentRequestService,
  ) {
    this.client = new LightningClient(http);
  }

  getDefaultClient(): LightningClient {
    return this.client;
  }

  async createUser(address: string): Promise<LnBitsUserDto> {
    const users = await this.client.getUsers({ username: address });
    if (users.length) throw new ConflictException(`User ${address} already exists`);

    const walletname = 'BTC';

    const user = await this.client.createUser(address, walletname);
    if (!user.wallets) throw new NotFoundException('Wallet not found');

    const lnbitsAddress = LightningHelper.createLnbitsAddress(address);

    const lightningAddress = LightningHelper.getLightningAddress(lnbitsAddress);
    const btcLnurlpDescription = `BTC payment to ${lightningAddress}`;

    const signMessage = await this.getSignMessage(LightningHelper.getLightningAddressAsLnurl(lnbitsAddress));
    const lnbitsAddressSignature = await this.client.signMessage(signMessage);

    const wallet = user.wallets[0];
    const lnurlp = await this.client.createLnurlpLink(wallet.adminkey, btcLnurlpDescription, 1, 100000000);

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
      const assetLnurlpDescription = `${asset} payment to ${lightningAddress}`;
      const assetPaylink = await this.client.createLnurlpLink(
        assetWallet.adminkey,
        assetLnurlpDescription,
        1,
        100000000,
      );

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

  async getCurrencies(withMultiplier = false): Promise<Currency[]> {
    return this.lightningCurrencyService.getCurrencies(withMultiplier);
  }

  async getPaymentMethods(): Promise<Blockchain[]> {
    return this.lightningCurrencyService.getPaymentMethods();
  }

  async getWalletPaymentParam(address: string, params: any): Promise<LightingWalletPaymentParamDto> {
    return this.lightningCurrencyService.getWalletPaymentParam(address, params);
  }

  async walletPaymentParamCheck(walletPaymentParam: LightingWalletPaymentParamDto) {
    return this.lightningCurrencyService.walletPaymentParamCheck(walletPaymentParam);
  }

  async createPaymentRequest(
    walletPaymentParam: LightingWalletPaymentParamDto,
    lightningWallet: LightningWalletEntity,
  ): Promise<LnBitsLnurlpInvoiceDto> {
    //await this.paymentRequestService.checkDuplicate(walletPaymentParam)

    this.lightningCurrencyService.fillWalletPaymentMemo(walletPaymentParam);

    const invoice = await this.client.getLnBitsWalletPayment(lightningWallet.adminKey, walletPaymentParam);

    const accountAmount = walletPaymentParam.amount;
    const transferAmount = walletPaymentParam.amount;
    if (!accountAmount || !transferAmount) return { pr: '', routes: [] };

    const blockchain = blockchainFindBy(walletPaymentParam.method ?? '');
    if (!blockchain) return { pr: '', routes: [] };

    await this.paymentRequestService.savePaymentRequest(
      Number(accountAmount),
      Number(transferAmount),
      invoice.pr,
      blockchain,
      lightningWallet,
    );

    return invoice;
  }
}
