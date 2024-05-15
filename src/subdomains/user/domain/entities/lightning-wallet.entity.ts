import { IEntity } from 'src/shared/db/entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { AssetAccountEntity } from '../../../master-data/asset/entities/asset-account.entity';
import { WalletEntity } from './wallet.entity';

@Entity('lightning_wallet')
export class LightningWalletEntity extends IEntity {
  @Column({ unique: true })
  lnbitsWalletId: string;

  @Column()
  adminKey: string;

  @Column()
  invoiceKey: string;

  @Column()
  lnurlpId: string;

  @Column({ type: 'float', default: 0 })
  balance: number;

  @ManyToOne(() => AssetAccountEntity, { nullable: false, eager: true })
  asset: AssetAccountEntity;

  @ManyToOne(() => WalletEntity, { nullable: false })
  wallet: WalletEntity;
}
