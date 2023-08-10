import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LightningService } from 'src/integration/blockchain/lightning/services/lightning.service';
import { IntegrationModule } from 'src/integration/integration.module';
import { SharedModule } from 'src/shared/shared.module';
import { AuthService } from 'src/subdomains/user/application/services/auth.service';
import { AuthController } from './api/controllers/auth.controller';
import { UserController } from './api/controllers/user.controller';
import { UserRepository } from './application/repositories/user.repository';
import { WalletProviderRepository } from './application/repositories/wallet-provider.repository';
import { WalletRepository } from './application/repositories/wallet.repository';
import { UserService } from './application/services/user.service';
import { WalletProviderService } from './application/services/wallet-provider.service';
import { WalletService } from './application/services/wallet.service';
import { User } from './domain/entities/user.entity';
import { WalletProvider } from './domain/entities/wallet-provider.entity';
import { Wallet } from './domain/entities/wallet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, WalletProvider, Wallet]), SharedModule, IntegrationModule],
  controllers: [UserController, AuthController],
  providers: [
    UserRepository,
    WalletProviderRepository,
    WalletRepository,
    UserService,
    WalletService,
    WalletProviderService,
    AuthService,
    LightningService,
  ],
  exports: [],
})
export class UserModule {}
