import { Injectable } from '@nestjs/common';
import { WalletProvider } from '../../domain/entities/wallet-provider.entity';
import { WalletProviderRepository } from '../repositories/wallet-provider.repository';

@Injectable()
export class WalletProviderService {
  constructor(private walletProviderRepo: WalletProviderRepository) {}

  async getWalletProviderByName(name: string): Promise<WalletProvider> {
    return this.walletProviderRepo.findOneBy({ name });
  }
}
