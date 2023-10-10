import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { WalletProviderEntity } from '../../domain/entities/wallet-provider.entity';

@Injectable()
export class WalletProviderRepository extends BaseRepository<WalletProviderEntity> {
  constructor(manager: EntityManager) {
    super(WalletProviderEntity, manager);
  }
}
