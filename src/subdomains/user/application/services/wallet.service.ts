import { Injectable, NotFoundException } from '@nestjs/common';
import { LnBitsUserDto } from 'src/integration/blockchain/lightning/dto/lnbits.dto';
import { LightningHelper } from 'src/integration/blockchain/lightning/lightning-helper';
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
      lnbitsAddress: LightningHelper.createLnbitsAddress(signUp.address),
      walletProvider: await this.walletProviderService.getByNameOrThrow(signUp.wallet),
      user: await this.userService.create(),
      lightningWallets: this.createLightningWallets(lnbitsUser),
    });

    return this.repo.save(wallet);
  }

  private createLightningWallets(lnbitsUser: LnBitsUserDto): Partial<LightningWallet>[] {
    return lnbitsUser.wallets.map((w) => {
      const wallet: Partial<LightningWallet> = {
        lnbitsWalletId: w.wallet.id,
        asset: w.wallet.name,
        adminKey: w.wallet.adminkey,
        invoiceKey: w.wallet.inkey,
        lnurlpId: w.lnurlp.id,
      };

      return Object.assign(new LightningWallet(), wallet);
    });
  }
}
