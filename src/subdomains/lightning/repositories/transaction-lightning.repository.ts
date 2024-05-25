import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager, Equal } from 'typeorm';
import { TransactionLightningEntity } from '../entities/transaction-lightning.entity';

@Injectable()
export class TransactionLightningRepository extends BaseRepository<TransactionLightningEntity> {
  constructor(manager: EntityManager) {
    super(TransactionLightningEntity, manager);
  }

  async getEntriesWithMaxCreationTimestamp(): Promise<TransactionLightningEntity[]> {
    const subQuery = this.createQueryBuilder('tl2').select('MAX(tl2.creationTimestamp)').getQuery();
    return this.createQueryBuilder('tl1').select().where(`tl1.creationTimestamp=(${subQuery})`).getMany();
  }

  async getByTransaction(transaction: string): Promise<TransactionLightningEntity> {
    const transactionEntity = await this.findOneBy({ transaction: Equal(transaction) });
    if (!transactionEntity) throw new NotFoundException(`Transaction not found by id ${transaction}`);

    return transactionEntity;
  }
}
