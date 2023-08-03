import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { GetConfig } from './config/config';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [TypeOrmModule.forRoot(GetConfig().database), SharedModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
