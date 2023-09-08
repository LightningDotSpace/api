import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { SupportController } from './controllers/support.controller';
import { SupportService } from './services/support.service';

@Module({
  imports: [TypeOrmModule.forFeature(), SharedModule],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [],
})
export class SupportModule {}
