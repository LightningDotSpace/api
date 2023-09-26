import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { TransactionOnchainEntity } from '../entities/transaction-onchain.entity';

@Injectable()
export class TransactionOnchainRepository extends BaseRepository<TransactionOnchainEntity> {
  constructor(manager: EntityManager) {
    super(TransactionOnchainEntity, manager);
  }

  async getMaxId() {
    return this.createQueryBuilder()
      .select('MAX(id)', 'id')
      .getRawOne<{ id: number }>()
      .then((r) => r?.id);
  }
}
