import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { EntityManager } from 'typeorm';
import { MonitoringEvmBalanceEntity } from '../entities/monitoring-evm-balance.entity';

@Injectable()
export class MonitoringEvmBalanceRepository extends BaseRepository<MonitoringEvmBalanceEntity> {
  constructor(manager: EntityManager) {
    super(MonitoringEvmBalanceEntity, manager);
  }

  async getEvmBalanceHistory(
    fromDate: Date,
    grouping: 'raw' | 'hourly' | 'daily',
  ): Promise<{ timestamp: string; blockchain: string; nativeBalance: number; tokenBalances: string }[]> {
    if (grouping === 'raw') {
      return this.createQueryBuilder('b')
        .select('b.created', 'timestamp')
        .addSelect('b.blockchain', 'blockchain')
        .addSelect('b.nativeBalance', 'nativeBalance')
        .addSelect('b.tokenBalances', 'tokenBalances')
        .where('b.created >= :fromDate', { fromDate })
        .orderBy('b.created', 'ASC')
        .getRawMany();
    }

    const format = grouping === 'hourly' ? 'yyyy-MM-dd HH:00' : 'yyyy-MM-dd';

    return this.createQueryBuilder('b')
      .innerJoin(
        (qb) =>
          qb
            .select('MAX(sub.id)', 'maxId')
            .from(MonitoringEvmBalanceEntity, 'sub')
            .where('sub.created >= :fromDate', { fromDate })
            .groupBy(`sub.blockchain, FORMAT(sub.created, '${format}')`),
        'latest',
        'b.id = latest.maxId',
      )
      .select('b.created', 'timestamp')
      .addSelect('b.blockchain', 'blockchain')
      .addSelect('b.nativeBalance', 'nativeBalance')
      .addSelect('b.tokenBalances', 'tokenBalances')
      .orderBy('b.created', 'ASC')
      .setParameters({ fromDate })
      .getRawMany();
  }

  async getLatestEvmBalances(): Promise<MonitoringEvmBalanceEntity[]> {
    return this.createQueryBuilder('b')
      .innerJoin(
        (qb) =>
          qb
            .select('MAX(sub.id)', 'maxId')
            .from(MonitoringEvmBalanceEntity, 'sub')
            .groupBy('sub.blockchain'),
        'latest',
        'b.id = latest.maxId',
      )
      .getMany();
  }

  async saveIfBalanceDiff(entity: MonitoringEvmBalanceEntity): Promise<MonitoringEvmBalanceEntity> {
    const lastEntity = await this.getLastByBlockchain(entity.blockchain);
    if (!lastEntity) return this.save(entity);

    if (entity.checksum() === lastEntity.checksum()) return lastEntity;

    return this.save(entity);
  }

  async getLastByBlockchain(blockchain: Blockchain): Promise<MonitoringEvmBalanceEntity | null> {
    return this.findOne({
      where: { blockchain },
      order: { id: 'DESC' },
    });
  }
}
