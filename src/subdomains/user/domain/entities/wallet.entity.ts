import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { IEntity } from 'src/shared/db/entity';
import { UserEntity } from 'src/subdomains/user/domain/entities/user.entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { LightningWalletEntity } from './lightning-wallet.entity';
import { WalletProviderEntity } from './wallet-provider.entity';

@Entity('wallet')
export class WalletEntity extends IEntity {
  @Column({ unique: true })
  address: string;

  @Column()
  signature: string;

  @Column({ unique: true })
  lnbitsUserId: string;

  @Column({ unique: true })
  lnbitsAddress: string;

  @Column({ unique: true })
  addressOwnershipProof: string;

  @ManyToOne(() => WalletProviderEntity, { nullable: false, eager: true })
  walletProvider: WalletProviderEntity;

  @Column({ default: WalletRole.USER })
  role: WalletRole;

  @ManyToOne(() => UserEntity, { nullable: false, eager: true })
  user: UserEntity;

  @OneToMany(() => LightningWalletEntity, (wallet) => wallet.wallet, { cascade: true, eager: true })
  lightningWallets: LightningWalletEntity[];
}
