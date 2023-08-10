import { Injectable, NotFoundException } from '@nestjs/common';
import { Wallet } from '../../domain/entities/wallet.entity';
import { SignUpDto } from '../dto/sign-up.dto';
import { WalletRepository } from '../repositories/wallet.repository';
import { UserService } from './user.service';
import { WalletProviderService } from './wallet-provider.service';

@Injectable()
export class WalletService {
  constructor(
    private repo: WalletRepository,
    private userService: UserService,
    private walletProviderService: WalletProviderService,
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

  async create(dto: SignUpDto): Promise<Wallet> {
    const wallet = this.repo.create({
      address: dto.address,
      signature: dto.signature,
      walletProvider: await this.walletProviderService.getByNameOrThrow(dto.wallet),
      user: await this.userService.create(),
    });

    return this.repo.save(wallet);
  }
}
