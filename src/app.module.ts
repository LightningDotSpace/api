import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { GetConfig } from './config/config';
import { LightningWebSocketService } from './integration/blockchain/lightning/services/lightning-ws.service';
import { SharedModule } from './shared/shared.module';
import { LightningForwardModule } from './subdomains/lightning/lightning-forward.module';
import { LightningTransactionModule } from './subdomains/lightning/lightning-transaction.module';
import { SupportModule } from './subdomains/support/support.module';
import { UserModule } from './subdomains/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(GetConfig().database),
    SharedModule,
    UserModule,
    LightningForwardModule,
    LightningTransactionModule,
    SupportModule,
  ],
  controllers: [AppController],
  providers: [LightningWebSocketService],
})
export class AppModule {}
