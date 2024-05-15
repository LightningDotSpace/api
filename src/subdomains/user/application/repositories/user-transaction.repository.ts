import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { UserTransactionEntity } from '../../domain/entities/user-transaction.entity';

@Injectable()
export class UserTransactionRepository extends BaseRepository<UserTransactionEntity> {
  constructor(manager: EntityManager) {
    super(UserTransactionEntity, manager);
  }

  async getMaxCreationTimestamp(lnbitsWalletId: string): Promise<{ maxCreationTimestamp: Date } | undefined> {
    return this.createQueryBuilder('ut')
      .select('max(ut.creationTimestamp) as maxCreationTimestamp')
      .leftJoin('ut.lightningWallet', 'lw')
      .where('lw.lnbitsWalletId = :lnbitsWalletId', { lnbitsWalletId })
      .groupBy('lw.lnbitsWalletId')
      .getRawOne<{ maxCreationTimestamp: Date }>();
  }

  async getByLightningWalletId(lightningWalletId: number): Promise<UserTransactionEntity[]> {
    return this.findBy({ lightningWallet: { id: lightningWalletId } });
  }
}
