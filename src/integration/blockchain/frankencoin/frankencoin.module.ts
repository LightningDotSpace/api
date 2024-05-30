import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { FrankencoinService } from './frankencoin.service';

@Module({
  imports: [SharedModule],
  controllers: [],
  providers: [FrankencoinService],
  exports: [FrankencoinService],
})
export class FrankencoinModule {}
