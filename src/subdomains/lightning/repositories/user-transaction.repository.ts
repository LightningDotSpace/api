import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { UserTransactionEntity } from '../entities/user-transaction.entity';

@Injectable()
export class UserTransactionRepository extends BaseRepository<UserTransactionEntity> {
  constructor(manager: EntityManager) {
    super(UserTransactionEntity, manager);
  }

  async getMaxId() {
    return this.createQueryBuilder()
      .select('MAX(id)', 'id')
      .getRawOne<{ id: number }>()
      .then((r) => r?.id);
  }
}
