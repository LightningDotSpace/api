import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LnbitsWebhookModule } from 'src/integration/blockchain/lightning/lnbits-webhook.module';
import { IntegrationModule } from 'src/integration/integration.module';
import { SharedModule } from 'src/shared/shared.module';
import { AuthService } from 'src/subdomains/user/application/services/auth.service';
import { BoltzModule } from '../boltz/boltz.module';
import { LightningTransactionModule } from '../lightning/lightning-transaction.module';
import { AssetModule } from '../master-data/asset/asset.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { PaymentRequestModule } from '../payment-request/payment-request.module';
import { AuthController } from './api/controllers/auth.controller';
import { UserController } from './api/controllers/user.controller';
import { LightningWalletSynchronizeController } from './application/controller/lightning-wallet-sync.controller';
import { LightningWalletRepository } from './application/repositories/lightning-wallet.repository';
import { UserBoltcardRepository } from './application/repositories/user-boltcard.repository';
import { UserTransactionRepository } from './application/repositories/user-transaction.repository';
import { UserRepository } from './application/repositories/user.repository';
import { WalletProviderRepository } from './application/repositories/wallet-provider.repository';
import { WalletRepository } from './application/repositories/wallet.repository';
import { LightningWalletService } from './application/services/lightning-wallet.service';
import { UserBoltcardService } from './application/services/user-boltcard.service';
import { UserTransactionService } from './application/services/user-transaction.service';
import { UserService } from './application/services/user.service';
import { WalletProviderService } from './application/services/wallet-provider.service';
import { WalletService } from './application/services/wallet.service';
import { LightningWalletEntity } from './domain/entities/lightning-wallet.entity';
import { UserBoltcardEntity } from './domain/entities/user-boltcard.entity';
import { UserTransactionEntity } from './domain/entities/user-transaction.entity';
import { UserEntity } from './domain/entities/user.entity';
import { WalletProviderEntity } from './domain/entities/wallet-provider.entity';
import { WalletEntity } from './domain/entities/wallet.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      WalletProviderEntity,
      WalletEntity,
      LightningWalletEntity,
      UserTransactionEntity,
      UserBoltcardEntity,
    ]),
    SharedModule,
    IntegrationModule,
    forwardRef(() => MonitoringModule),
    BoltzModule,
    AssetModule,
    LnbitsWebhookModule,
    LightningTransactionModule,
    PaymentRequestModule,
  ],
  controllers: [UserController, AuthController, LightningWalletSynchronizeController],
  providers: [
    UserRepository,
    WalletProviderRepository,
    WalletRepository,
    LightningWalletRepository,
    UserTransactionRepository,
    UserBoltcardRepository,
    AuthService,
    UserService,
    WalletProviderService,
    WalletService,
    LightningWalletService,
    UserTransactionService,
    UserBoltcardService,
  ],
  exports: [
    UserService,
    WalletProviderService,
    WalletService,
    LightningWalletService,
    UserTransactionService,
    UserBoltcardService,
  ],
})
export class UserModule {}
