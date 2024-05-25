import { IEntity } from 'src/shared/db/entity';
import { AssetAccountEntity } from 'src/subdomains/master-data/asset/entities/asset-account.entity';
import { Column, Entity, ManyToOne } from 'typeorm';

@Entity('monitoring_balance')
export class MonitoringBalanceEntity extends IEntity {
  @ManyToOne(() => AssetAccountEntity, { eager: true })
  asset: AssetAccountEntity;

  @Column({ type: 'float' })
  onchainBalance: number;

  @Column({ type: 'float' })
  lightningBalance: number;

  @Column({ type: 'float' })
  customerBalance: number;

  // --- ENTITY METHODS --- //

  checksum(): number {
    return this.onchainBalance + this.lightningBalance + this.customerBalance;
  }
}
