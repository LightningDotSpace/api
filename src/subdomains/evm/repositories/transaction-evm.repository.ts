import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { TransactionEvmEntity } from '../entities/transaction-evm.entity';

@Injectable()
export class TransactionEvmRepository extends BaseRepository<TransactionEvmEntity> {
  constructor(manager: EntityManager) {
    super(TransactionEvmEntity, manager);
  }
}
