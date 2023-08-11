import { IEntity } from 'src/shared/db/entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { Wallet } from './wallet.entity';

@Entity()
export class LightningWallet extends IEntity {
  @Column({ unique: true })
  lightningWalletId: string;

  @Column()
  asset: string;

  @Column()
  adminKey: string;

  @Column()
  invoiceKey: string;

  @Column()
  lnurlpId: string;

  @ManyToOne(() => Wallet, { nullable: false, eager: true })
  wallet: Wallet;
}
