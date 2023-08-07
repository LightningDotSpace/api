import { Injectable, NotFoundException } from '@nestjs/common';
import { Util } from 'src/shared/utils/util';
import { User } from '../../domain/entities/user.entity';
import { WalletProvider } from '../../domain/entities/wallet-provider.entity';
import { Wallet } from '../../domain/entities/wallet.entity';
import { SignUpDto } from '../dto/sign-up.dto';
import { WalletDto } from '../dto/wallet.dto';
import { WalletRepository } from '../repositories/wallet.repository';
import { UserService } from './user.service';
import { WalletProviderService } from './wallet-provider.service';

@Injectable()
export class WalletService {
  constructor(
    private walletRepo: WalletRepository,
    private userService: UserService,
    private walletProviderService: WalletProviderService,
  ) {}

  async getWalletDto(walletId: number): Promise<WalletDto> {
    const wallet = await this.walletRepo.findOne({ where: { id: walletId }, relations: ['user'] });
    if (!wallet) throw new NotFoundException('Wallet not found');

    return this.toDto(wallet);
  }

  async getByAddress(address: string, needsRelation = false): Promise<Wallet> {
    return this.walletRepo.findOne({
      where: { address },
      relations: needsRelation ? ['user', 'walletProvider'] : [],
    });
  }

  async getWalletByKey(key: string, value: any): Promise<Wallet> {
    return this.walletRepo
      .createQueryBuilder('wallet')
      .select('wallet')
      .leftJoinAndSelect('wallet.user', 'user')
      .leftJoinAndSelect('user.wallets', 'wallets')
      .where(`wallet.${key} = :param`, { param: value })
      .getOne();
  }

  async createWallet(dto: SignUpDto, user?: User): Promise<Wallet> {
    const wallet = this.walletRepo.create({
      address: dto.address,
      signature: dto.signature,
      walletProvider: await this.checkWalletProvider(dto.walletName),
      user: user ?? (await this.userService.createUser()),
    });

    // retry (in case of ref conflict)
    return Util.retry(async () => {
      return this.walletRepo.save(wallet);
    }, 3);
  }

  private async checkWalletProvider(name: string): Promise<WalletProvider> {
    const walletProvider = await this.walletProviderService.getWalletProviderByName(name);
    if (!walletProvider) throw new NotFoundException(`No wallet provider with name: ${name}`);

    return walletProvider;
  }

  // --- DTO --- //
  private async toDto(wallet: Wallet): Promise<WalletDto> {
    return {
      address: wallet.address,
    };
  }
}
