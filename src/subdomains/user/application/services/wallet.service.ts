import { Injectable, NotFoundException } from '@nestjs/common';
import { LnBitsUserDto } from 'src/integration/blockchain/lightning/dto/lnbits.dto';
import { Wallet } from '../../domain/entities/wallet.entity';
import { SignUpDto } from '../dto/sign-up.dto';
import { WalletRepository } from '../repositories/wallet.repository';
import { LightningWalletService } from './lightning-wallet.service';
import { UserService } from './user.service';
import { WalletProviderService } from './wallet-provider.service';

@Injectable()
export class WalletService {
  constructor(
    private repo: WalletRepository,
    private userService: UserService,
    private walletProviderService: WalletProviderService,
    private lightningWalletService: LightningWalletService,
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

  async create(signUp: SignUpDto, lnbitsUser: LnBitsUserDto): Promise<Wallet> {
    const wallet = this.repo.create({
      address: signUp.address,
      signature: signUp.signature,
      lnbitsUserId: lnbitsUser.id,
      walletProvider: await this.walletProviderService.getByNameOrThrow(signUp.wallet),
      user: await this.userService.create(),
    });

    const savedWallet = await this.repo.save(wallet);

    savedWallet.lightningWallets = await this.lightningWalletService.create(savedWallet, lnbitsUser);

    return savedWallet;
  }
}
