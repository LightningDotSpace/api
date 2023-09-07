import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { GetConfig } from './config/config';
import { SharedModule } from './shared/shared.module';
import { LightningForwardModule } from './subdomains/lightning/lightning-forward.module';
import { AssetModule } from './subdomains/master-data/asset/asset.module';
import { UserModule } from './subdomains/user/user.module';

@Module({
  imports: [TypeOrmModule.forRoot(GetConfig().database), SharedModule, UserModule, AssetModule, LightningForwardModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
