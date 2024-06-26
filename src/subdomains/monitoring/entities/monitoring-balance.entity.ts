import { LightningHelper } from 'src/integration/blockchain/lightning/lightning-helper';
import { IEntity } from 'src/shared/db/entity';
import { AssetAccountEntity } from 'src/subdomains/master-data/asset/entities/asset-account.entity';
import { Price } from 'src/subdomains/support/dto/price.dto';
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

  @Column({ type: 'float', default: 0 })
  assetCHF: number;

  @Column({ type: 'float', default: 0 })
  ldsBalance: number;

  @Column({ type: 'float', default: 0 })
  ldsBalanceCHF: number;

  // --- ENTITY METHODS --- //

  checksum(): number {
    return this.onchainBalance + this.lightningBalance + this.customerBalance;
  }

  updateBtcBalance(chfPrice: Price): this {
    this.ldsBalance = this.onchainBalance + this.lightningBalance - this.customerBalance;

    this.assetCHF = chfPrice.convert(1, 2);
    this.ldsBalanceCHF = chfPrice.convert(LightningHelper.satToBtc(this.ldsBalance), 2);

    return this;
  }

  updateChfBalance(): this {
    this.ldsBalance = this.onchainBalance + this.lightningBalance - this.customerBalance;

    this.assetCHF = 1;
    this.ldsBalanceCHF = this.ldsBalance;

    return this;
  }
}
