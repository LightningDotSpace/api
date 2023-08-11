import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { LightningWallet } from '../../domain/entities/lightning-wallet.entity';

@Injectable()
export class LightningWalletRepository extends BaseRepository<LightningWallet> {
  constructor(manager: EntityManager) {
    super(LightningWallet, manager);
  }
}
