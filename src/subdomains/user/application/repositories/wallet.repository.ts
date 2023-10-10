import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { WalletEntity } from '../../domain/entities/wallet.entity';

@Injectable()
export class WalletRepository extends BaseRepository<WalletEntity> {
  constructor(manager: EntityManager) {
    super(WalletEntity, manager);
  }
}
