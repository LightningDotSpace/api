import { Injectable } from '@nestjs/common';
import { WalletRepository } from 'src/subdomains/user/application/repositories/wallet.repository';
import { EntityManager } from 'typeorm';

@Injectable()
export class RepositoryFactory {
  public readonly wallet: WalletRepository;

  constructor(manager: EntityManager) {
    this.wallet = new WalletRepository(manager);
  }
}
