import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { GetConfig } from './config/config';
import { SharedModule } from './shared/shared.module';
import { LightningForwardModule } from './subdomains/lightning/lightning-forward.module';
import { SupportModule } from './subdomains/support/support.module';
import { UserModule } from './subdomains/user/user.module';
import { AtomicSwapModule } from './subdomains/atomic-swap/atomic-swap.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(GetConfig().database),
    SharedModule,
    UserModule,
    LightningForwardModule,
    SupportModule,
    AtomicSwapModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
