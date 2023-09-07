import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportController } from './controllers/support.controller';
import { SupportService } from './services/support.service';

@Module({
  imports: [TypeOrmModule.forFeature()],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [],
})
export class SupportModule {}
