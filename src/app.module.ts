import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { GetConfig } from './config/config';
import { SharedModule } from './shared/shared.module';
import { UserModule } from './subdomains/user/user.module';

@Module({
  imports: [TypeOrmModule.forRoot(GetConfig().database), SharedModule, UserModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
