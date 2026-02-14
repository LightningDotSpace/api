import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/shared/db/base.repository';
import { EntityManager } from 'typeorm';
import { MonitoringBalanceEntity } from '../entities/monitoring-balance.entity';

@Injectable()
export class MonitoringBalanceRepository extends BaseRepository<MonitoringBalanceEntity> {
  constructor(manager: EntityManager) {
    super(MonitoringBalanceEntity, manager);
  }

  async getBalanceHistory(
    assetName: string,
    fromDate: Date,
    grouping: 'raw' | 'hourly' | 'daily',
  ): Promise<{ timestamp: string; onchainBalance: number; lndOnchainBalance: number; lightningBalance: number; citreaBalance: number; customerBalance: number }[]> {
    if (grouping === 'raw') {
      return this.createQueryBuilder('b')
        .leftJoin('b.asset', 'asset')
        .select('b.created', 'timestamp')
        .addSelect('b.onchainBalance', 'onchainBalance')
        .addSelect('b.lndOnchainBalance', 'lndOnchainBalance')
        .addSelect('b.lightningBalance', 'lightningBalance')
        .addSelect('b.citreaBalance', 'citreaBalance')
        .addSelect('b.customerBalance', 'customerBalance')
        .where('asset.name = :assetName', { assetName })
        .andWhere('b.created >= :fromDate', { fromDate })
        .orderBy('b.created', 'ASC')
        .getRawMany();
    }

    const allowedFormats: Record<string, string> = { hourly: 'yyyy-MM-dd HH:00', daily: 'yyyy-MM-dd' };
    const format = allowedFormats[grouping];
    if (!format) throw new Error(`Invalid grouping: ${grouping}`);

    return this.createQueryBuilder('b')
      .innerJoin(
        (qb) =>
          qb
            .select('MAX(sub.id)', 'maxId')
            .from(MonitoringBalanceEntity, 'sub')
            .leftJoin('sub.asset', 'a')
            .where('a.name = :assetName', { assetName })
            .andWhere('sub.created >= :fromDate', { fromDate })
            .groupBy(`FORMAT(sub.created, '${format}')`),
        'latest',
        'b.id = latest.maxId',
      )
      .select('b.created', 'timestamp')
      .addSelect('b.onchainBalance', 'onchainBalance')
      .addSelect('b.lndOnchainBalance', 'lndOnchainBalance')
      .addSelect('b.lightningBalance', 'lightningBalance')
      .addSelect('b.citreaBalance', 'citreaBalance')
      .addSelect('b.customerBalance', 'customerBalance')
      .orderBy('b.created', 'ASC')
      .setParameters({ assetName, fromDate })
      .getRawMany();
  }

  async getLastBalanceBefore(
    assetName: string,
    beforeDate: Date,
  ): Promise<{ timestamp: string; onchainBalance: number; lndOnchainBalance: number; lightningBalance: number; citreaBalance: number; customerBalance: number } | undefined> {
    const results = await this.createQueryBuilder('b')
      .leftJoin('b.asset', 'asset')
      .select('b.created', 'timestamp')
      .addSelect('b.onchainBalance', 'onchainBalance')
      .addSelect('b.lndOnchainBalance', 'lndOnchainBalance')
      .addSelect('b.lightningBalance', 'lightningBalance')
      .addSelect('b.citreaBalance', 'citreaBalance')
      .addSelect('b.customerBalance', 'customerBalance')
      .where('asset.name = :assetName', { assetName })
      .andWhere('b.created < :beforeDate', { beforeDate })
      .orderBy('b.created', 'DESC')
      .limit(1)
      .getRawMany();

    return results[0];
  }

  async getLatestBalances(): Promise<MonitoringBalanceEntity[]> {
    return this.createQueryBuilder('b')
      .innerJoin(
        (qb) =>
          qb
            .select('MAX(sub.id)', 'maxId')
            .from(MonitoringBalanceEntity, 'sub')
            .groupBy('sub.assetId'),
        'latest',
        'b.id = latest.maxId',
      )
      .leftJoinAndSelect('b.asset', 'asset')
      .getMany();
  }

  async saveIfBalanceDiff(entity: MonitoringBalanceEntity): Promise<MonitoringBalanceEntity> {
    const maxEntity = await this.maxEntity(entity.asset.id);
    if (!maxEntity) return this.save(entity);

    if (entity.checksum() === maxEntity.checksum()) return maxEntity;

    return this.save(entity);
  }

  private async maxEntity(assetId: number): Promise<MonitoringBalanceEntity | null> {
    const maxId = await this.createQueryBuilder()
      .select('max(id) as maxId')
      .where('assetId = :assetId', { assetId })
      .getRawOne<{ maxId: number }>();
    if (!maxId) return null;

    return this.findOneBy({ id: maxId.maxId });
  }
}
