import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { BitcoinService } from './bitcoin.service';

@Module({
  imports: [SharedModule],
  providers: [BitcoinService],
  exports: [BitcoinService],
})
export class BitcoinModule {}
