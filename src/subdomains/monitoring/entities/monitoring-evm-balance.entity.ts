import { IEntity } from 'src/shared/db/entity';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Column, Entity, Index } from 'typeorm';
import { EvmTokenBalanceJson } from '../dto/monitoring.dto';

@Entity('monitoring_evm_balance')
@Index(['blockchain'], { unique: false })
export class MonitoringEvmBalanceEntity extends IEntity {
  @Column({ type: 'varchar', length: 50 })
  blockchain: Blockchain;

  @Column({ type: 'varchar', length: 10 })
  nativeSymbol: string;

  @Column({ type: 'float', default: 0 })
  nativeBalance: number;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  tokenBalances: string;

  // --- FACTORY METHOD --- //

  static create(
    blockchain: Blockchain,
    nativeSymbol: string,
    nativeBalance: number,
    tokens: EvmTokenBalanceJson[],
  ): MonitoringEvmBalanceEntity {
    const entity = new MonitoringEvmBalanceEntity();

    entity.blockchain = blockchain;
    entity.nativeSymbol = nativeSymbol;
    entity.nativeBalance = nativeBalance;
    entity.tokenBalances = JSON.stringify({ tokens });

    return entity;
  }

  // --- ENTITY METHODS --- //

  getTokenBalances(): EvmTokenBalanceJson[] {
    if (!this.tokenBalances) return [];

    try {
      const parsed = JSON.parse(this.tokenBalances) as { tokens: EvmTokenBalanceJson[] };
      return parsed.tokens ?? [];
    } catch {
      return [];
    }
  }

  checksum(): string {
    return `${this.nativeBalance}-${this.tokenBalances}`;
  }
}
