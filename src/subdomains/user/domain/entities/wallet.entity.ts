import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { IEntity } from 'src/shared/db/entity';
import { User } from 'src/subdomains/user/domain/entities/user.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { WalletProvider } from './wallet-provider.entity';

@Entity()
export class Wallet extends IEntity {
  @Column({ unique: true })
  address: string;

  @Column()
  signature: string;

  @Column({ nullable: true })
  lightningUser: string;

  @Column({ nullable: true })
  lightningWallet: string;

  @Column({ nullable: true })
  lightningLnurlp: string;

  @ManyToOne(() => WalletProvider, { nullable: false, eager: true })
  walletProvider: WalletProvider;

  @Column({ default: WalletRole.USER })
  role: WalletRole;

  @ManyToOne(() => User, { nullable: false, eager: true })
  user: User;
}
