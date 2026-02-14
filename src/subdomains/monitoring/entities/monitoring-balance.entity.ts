import { LightningHelper } from 'src/integration/blockchain/lightning/lightning-helper';
import { IEntity } from 'src/shared/db/entity';
import { AssetAccountEntity } from 'src/subdomains/master-data/asset/entities/asset-account.entity';
import { Price } from 'src/subdomains/support/dto/price.dto';
import { LightningWalletTotalBalanceDto } from 'src/subdomains/user/application/dto/lightning-wallet.dto';
import { Column, Entity, ManyToOne } from 'typeorm';
import { MonitoringBlockchainBalance } from '../dto/monitoring.dto';

@Entity('monitoring_balance')
export class MonitoringBalanceEntity extends IEntity {
  @ManyToOne(() => AssetAccountEntity, { eager: true })
  asset: AssetAccountEntity;

  @Column({ type: 'float', default: 0 })
  onchainBalance: number;

  @Column({ type: 'float', default: 0 })
  lndOnchainBalance: number;

  @Column({ type: 'float', default: 0 })
  lightningBalance: number;

  @Column({ type: 'float', default: 0 })
  citreaBalance: number;

  @Column({ type: 'float', default: 0 })
  customerBalance: number;

  @Column({ type: 'float', default: 0 })
  assetPriceInCHF: number;

  @Column({ type: 'float', default: 0 })
  ldsBalance: number;

  @Column({ type: 'float', default: 0 })
  ldsBalanceInCHF: number;

  // --- FACTORY METHODS --- //

  static createAsBtcEntity(
    blockchainBalance: MonitoringBlockchainBalance,
    internalBalance: LightningWalletTotalBalanceDto,
    customerBalance: LightningWalletTotalBalanceDto,
    chfPrice: Price,
  ): MonitoringBalanceEntity {
    const entity = new MonitoringBalanceEntity();

    entity.asset = { id: customerBalance.assetId } as AssetAccountEntity;
    entity.onchainBalance = blockchainBalance.onchainBalance;
    entity.lndOnchainBalance = blockchainBalance.lndOnchainBalance;
    entity.lightningBalance = blockchainBalance.lightningBalance;
    entity.citreaBalance = blockchainBalance.citreaBalance;
    entity.customerBalance = customerBalance.totalBalance;

    entity.ldsBalance =
      entity.onchainBalance +
      entity.lndOnchainBalance +
      entity.lightningBalance +
      entity.citreaBalance +
      internalBalance.totalBalance -
      entity.customerBalance;

    entity.assetPriceInCHF = chfPrice.convert(1, 2);
    entity.ldsBalanceInCHF = chfPrice.convert(LightningHelper.satToBtc(entity.ldsBalance), 2);

    return entity;
  }

  static createAsChfEntity(
    evmchainBalance: number,
    customerBalance: LightningWalletTotalBalanceDto,
  ): MonitoringBalanceEntity {
    const entity = new MonitoringBalanceEntity();

    entity.asset = { id: customerBalance.assetId } as AssetAccountEntity;
    entity.lndOnchainBalance = evmchainBalance;
    entity.lightningBalance = 0;
    entity.customerBalance = customerBalance.totalBalance;

    entity.ldsBalance = entity.lndOnchainBalance + entity.lightningBalance - entity.customerBalance;

    entity.assetPriceInCHF = 1;
    entity.ldsBalanceInCHF = entity.ldsBalance;

    return entity;
  }
  // --- ENTITY METHODS --- //

  checksum(): number {
    return this.onchainBalance + this.lightningBalance + this.citreaBalance + this.customerBalance;
  }
}
