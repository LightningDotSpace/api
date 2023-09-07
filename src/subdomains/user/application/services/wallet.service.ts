import { Injectable, NotFoundException } from '@nestjs/common';
import {
  LnBitsLnurlpLinkDto,
  LnBitsUserDto,
  LnBitsUsermanagerWalletDto,
} from 'src/integration/blockchain/lightning/dto/lnbits.dto';
import { LightningService } from 'src/integration/blockchain/lightning/services/lightning.service';
import { AssetService } from 'src/subdomains/master-data/asset/services/asset.service';
import { LightningWallet } from '../../domain/entities/lightning-wallet.entity';
import { Wallet } from '../../domain/entities/wallet.entity';
import { SignUpDto } from '../dto/sign-up.dto';
import { WalletRepository } from '../repositories/wallet.repository';
import { UserService } from './user.service';
import { WalletProviderService } from './wallet-provider.service';

@Injectable()
export class WalletService {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly userService: UserService,
    private readonly assetService: AssetService,
    private readonly lightningService: LightningService,
    private readonly walletProviderService: WalletProviderService,
  ) {}

  async get(id: number): Promise<Wallet | null> {
    return this.walletRepo.findOneBy({ id });
  }

  async getOrThrow(id: number): Promise<Wallet> {
    const wallet = await this.get(id);
    if (!wallet) throw new NotFoundException('Wallet not found');

    return wallet;
  }

  async getByAddress(address: string): Promise<Wallet | null> {
    return this.walletRepo.findOneBy({ address });
  }

  async getByLnbitsAddress(lnbitsAddress: string): Promise<Wallet | null> {
    return this.walletRepo.findOneBy({ lnbitsAddress });
  }

  async create(signUp: SignUpDto): Promise<Wallet> {
    const lnbitsUser = await this.lightningService.createUser(signUp.address);

    const wallet = this.walletRepo.create({
      address: signUp.address,
      signature: signUp.signature,
      lnbitsUserId: lnbitsUser.id,
      lnbitsAddress: lnbitsUser.address,
      addressOwnershipProof: lnbitsUser.addressSignature,
      walletProvider: await this.walletProviderService.getByNameOrThrow(signUp.wallet),
      user: await this.userService.create(),
      lightningWallets: await this.createLightningWallets(lnbitsUser),
    });

    return this.walletRepo.save(wallet);
  }

  private async createLightningWallets(lnbitsUser: LnBitsUserDto): Promise<Partial<LightningWallet>[]> {
    return Promise.all(lnbitsUser.wallets.map((w) => this.createLightningWallet(w)));
  }

  private async createLightningWallet(w: {
    wallet: LnBitsUsermanagerWalletDto;
    lnurlp: LnBitsLnurlpLinkDto;
  }): Promise<Partial<LightningWallet>> {
    const wallet: Partial<LightningWallet> = {
      lnbitsWalletId: w.wallet.id,
      asset: await this.assetService.getAssetByName(w.wallet.name),
      adminKey: w.wallet.adminkey,
      invoiceKey: w.wallet.inkey,
      lnurlpId: w.lnurlp.id,
    };

    return Object.assign(new LightningWallet(), wallet);
  }
}
