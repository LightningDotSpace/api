import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RskSwapClientService } from './services/rsk-swap-client.service';
import { RskSwapController } from './controllers/rsk-swap.controller';

@Module({
  imports: [HttpModule],
  controllers: [RskSwapController],
  providers: [RskSwapClientService],
  exports: [RskSwapClientService],
})
export class RskSwapModule {}
