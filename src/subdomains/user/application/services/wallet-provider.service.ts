import { Injectable, NotFoundException } from '@nestjs/common';
import { WalletProvider } from '../../domain/entities/wallet-provider.entity';
import { WalletProviderRepository } from '../repositories/wallet-provider.repository';

@Injectable()
export class WalletProviderService {
  constructor(private repo: WalletProviderRepository) {}

  async getByName(name: string): Promise<WalletProvider> {
    return this.repo.findOneBy({ name });
  }

  async getByNameOrThrow(name: string): Promise<WalletProvider> {
    const walletProvider = await this.getByName(name);
    if (!walletProvider) throw new NotFoundException('Wallet provider not found');

    return walletProvider;
  }
}
