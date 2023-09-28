import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { TransactionOnchainEntity } from '../entities/transaction-onchain.entity';

@Injectable()
export class TransactionOnchainRepository extends BaseRepository<TransactionOnchainEntity> {
  constructor(manager: EntityManager) {
    super(TransactionOnchainEntity, manager);
  }

  async getMaxBlock(): Promise<number | undefined> {
    return this.createQueryBuilder()
      .select('MAX(block)', 'block')
      .getRawOne<{ block: number }>()
      .then((r) => r?.block);
  }
}
