import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { GetConfig } from './config/config';
import { SharedModule } from './shared/shared.module';
import { LightningForwardModule } from './subdomains/lightning/lightning-forward.module';
import { MonitoringModule } from './subdomains/monitoring/monitoring.module';
import { SupportModule } from './subdomains/support/support.module';
import { UserModule } from './subdomains/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(GetConfig().database),
    SharedModule,
    UserModule,
    MonitoringModule,
    LightningForwardModule,
    SupportModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
