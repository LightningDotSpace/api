import { Module } from '@nestjs/common';
import { AlchemyService } from './services/alchemy.service';

@Module({
  imports: [],
  controllers: [],
  providers: [AlchemyService],
  exports: [AlchemyService],
})
export class AlchemyModule {}
