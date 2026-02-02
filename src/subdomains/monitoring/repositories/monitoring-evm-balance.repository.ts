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
