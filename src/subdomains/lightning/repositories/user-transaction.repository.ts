import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { UserTransactionEntity } from '../entities/user-transaction.entity';

@Injectable()
export class UserTransactionRepository extends BaseRepository<UserTransactionEntity> {
  constructor(manager: EntityManager) {
    super(UserTransactionEntity, manager);
  }

  async getEntriesWithMaxCreationTimestamp(): Promise<UserTransactionEntity[]> {
    const subQuery = this.createQueryBuilder('tl2').select('MAX(tl2.creationTimestamp)').getQuery();
    return this.createQueryBuilder('tl1').select().where(`tl1.creationTimestamp=(${subQuery})`).getMany();
  }
}
