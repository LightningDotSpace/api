import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationModule } from 'src/integration/integration.module';
import { SharedModule } from 'src/shared/shared.module';
import { AuthService } from 'src/subdomains/user/application/services/auth.service';
import { TransactionLightningEntity } from '../lightning/entities/transaction-lightning.entity';
import { TransactionOnchainEntity } from '../lightning/entities/transaction-onchain.entity';
import { UserTransactionEntity } from '../lightning/entities/user-transaction.entity';
import { AssetModule } from '../master-data/asset/asset.module';
import { AuthController } from './api/controllers/auth.controller';
import { UserController } from './api/controllers/user.controller';
import { LightingWalletRepository } from './application/repositories/lightning-wallet.repository';
import { UserRepository } from './application/repositories/user.repository';
import { WalletProviderRepository } from './application/repositories/wallet-provider.repository';
import { WalletRepository } from './application/repositories/wallet.repository';
import { UserService } from './application/services/user.service';
import { WalletProviderService } from './application/services/wallet-provider.service';
import { WalletService } from './application/services/wallet.service';
import { LightningWallet } from './domain/entities/lightning-wallet.entity';
import { User } from './domain/entities/user.entity';
import { WalletProvider } from './domain/entities/wallet-provider.entity';
import { Wallet } from './domain/entities/wallet.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      WalletProvider,
      Wallet,
      LightningWallet,
      TransactionOnchainEntity,
      TransactionLightningEntity,
      UserTransactionEntity,
    ]),
    SharedModule,
    IntegrationModule,
    AssetModule,
  ],
  controllers: [UserController, AuthController],
  providers: [
    UserRepository,
    WalletProviderRepository,
    WalletRepository,
    LightingWalletRepository,
    UserService,
    WalletService,
    WalletProviderService,
    AuthService,
  ],
  exports: [UserService, WalletService, WalletProviderService],
})
export class UserModule {}
