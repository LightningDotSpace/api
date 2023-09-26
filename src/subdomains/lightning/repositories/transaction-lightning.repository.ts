import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { TransactionLightningEntity } from '../entities/transaction-lightning.entity';

@Injectable()
export class TransactionLightningRepository extends BaseRepository<TransactionLightningEntity> {
  constructor(manager: EntityManager) {
    super(TransactionLightningEntity, manager);
  }

  async getMaxId() {
    return this.createQueryBuilder()
      .select('MAX(id)', 'id')
      .getRawOne<{ id: number }>()
      .then((r) => r?.id);
  }

  async getByTransaction(transaction: string): Promise<TransactionLightningEntity> {
    const transactionEntity = await this.findOneBy({ transaction: transaction });
    if (!transactionEntity) throw new NotFoundException(`Transaction not found by id ${transaction}`);

    return transactionEntity;
  }
}
