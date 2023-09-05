import { IEntity } from 'src/shared/db/entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { Asset } from './asset.entity';
import { Wallet } from './wallet.entity';

@Entity()
export class LightningWallet extends IEntity {
  @Column({ unique: true })
  lnbitsWalletId: string;

  @Column()
  adminKey: string;

  @Column()
  invoiceKey: string;

  @Column()
  lnurlpId: string;

  @ManyToOne(() => Asset, { nullable: false, eager: true })
  asset: Asset;

  @ManyToOne(() => Wallet, { nullable: false })
  wallet: Wallet;
}
