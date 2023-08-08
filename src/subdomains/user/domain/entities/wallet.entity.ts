import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { IEntity } from 'src/shared/entities/entity';
import { User } from 'src/subdomains/user/domain/entities/user.entity';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { WalletProvider } from './wallet-provider.entity';

@Entity()
@Index((w: Wallet) => [w.address], { unique: true })
export class Wallet extends IEntity {
  @Column()
  address: string;

  @Column()
  signature: string;

  @ManyToOne(() => WalletProvider, { nullable: false, eager: true })
  walletProvider: WalletProvider;

  @Column({ default: WalletRole.USER })
  role: WalletRole;

  @ManyToOne(() => User, { nullable: false, eager: true })
  user: User;
}
