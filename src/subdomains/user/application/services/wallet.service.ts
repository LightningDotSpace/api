import { Injectable, NotFoundException } from '@nestjs/common';
import { LnBitsUserDto } from 'src/integration/blockchain/lightning/dto/lnbits.dto';
import { LightningService } from 'src/integration/blockchain/lightning/services/lightning.service';
import { LightningWallet } from '../../domain/entities/lightning-wallet.entity';
import { Wallet } from '../../domain/entities/wallet.entity';
import { SignUpDto } from '../dto/sign-up.dto';
import { WalletRepository } from '../repositories/wallet.repository';
import { UserService } from './user.service';
import { WalletProviderService } from './wallet-provider.service';

@Injectable()
export class WalletService {
  constructor(
    private readonly repo: WalletRepository,
    private readonly userService: UserService,
    private readonly lightningService: LightningService,
    private readonly walletProviderService: WalletProviderService,
  ) {}

  async get(id: number): Promise<Wallet | null> {
    return this.repo.findOneBy({ id });
  }

  async getOrThrow(id: number): Promise<Wallet> {
    const wallet = await this.get(id);
    if (!wallet) throw new NotFoundException('Wallet not found');

    return wallet;
  }

  async getByAddress(address: string): Promise<Wallet | null> {
    return this.repo.findOneBy({ address });
  }

  async create(signUp: SignUpDto): Promise<Wallet> {
    const lnbitsUser = await this.lightningService.createUser(signUp.address);

    const wallet = this.repo.create({
      address: signUp.address,
      signature: signUp.signature,
      lnbitsUserId: lnbitsUser.id,
      walletProvider: await this.walletProviderService.getByNameOrThrow(signUp.wallet),
      user: await this.userService.create(),
      lightningWallets: this.createLightningWallets(lnbitsUser),
    });

    return this.repo.save(wallet);
  }

  private createLightningWallets(lnbitsUser: LnBitsUserDto): LightningWallet[] {
    const lightningWallets: LightningWallet[] = [];

    const lnbitsUserWallets = lnbitsUser.wallets;

    for (const lnbitsUserWallet of lnbitsUserWallets) {
      const lnurlpId = lnbitsUserWallet.lnurlp.id;
      if (!lnurlpId) throw new NotFoundException('LNURLp not found');

      const lightningWallet = new LightningWallet();

      lightningWallet.lightningWalletId = lnbitsUserWallet.wallet.id;
      lightningWallet.asset = lnbitsUserWallet.wallet.name;
      lightningWallet.adminKey = lnbitsUserWallet.wallet.adminkey;
      lightningWallet.invoiceKey = lnbitsUserWallet.wallet.inkey;
      lightningWallet.lnurlpId = lnurlpId;

      lightningWallets.push(lightningWallet);
    }

    return lightningWallets;
  }
}
