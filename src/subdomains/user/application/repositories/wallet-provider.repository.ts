import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { WalletProvider } from '../../domain/entities/wallet-provider.entity';

@Injectable()
export class WalletProviderRepository extends BaseRepository<WalletProvider> {
  constructor(manager: EntityManager) {
    super(WalletProvider, manager);
  }
}
