import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationModule } from 'src/integration/integration.module';
import { SharedModule } from 'src/shared/shared.module';
import { AuthService } from 'src/subdomains/user/application/services/auth.service';
import { AuthController } from './api/controllers/auth.controller';
import { UserController } from './api/controllers/user.controller';
import { AssetRepository } from './application/repositories/asset.repository';
import { UserRepository } from './application/repositories/user.repository';
import { WalletProviderRepository } from './application/repositories/wallet-provider.repository';
import { WalletRepository } from './application/repositories/wallet.repository';
import { UserService } from './application/services/user.service';
import { WalletProviderService } from './application/services/wallet-provider.service';
import { WalletService } from './application/services/wallet.service';
import { Asset } from './domain/entities/asset.entity';
import { LightningWallet } from './domain/entities/lightning-wallet.entity';
import { User } from './domain/entities/user.entity';
import { WalletProvider } from './domain/entities/wallet-provider.entity';
import { Wallet } from './domain/entities/wallet.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, WalletProvider, Wallet, LightningWallet, Asset]),
    SharedModule,
    IntegrationModule,
  ],
  controllers: [UserController, AuthController],
  providers: [
    UserRepository,
    WalletProviderRepository,
    WalletRepository,
    AssetRepository,
    UserService,
    WalletService,
    WalletProviderService,
    AuthService,
  ],
  exports: [UserService, WalletService, WalletProviderService],
})
export class UserModule {}
