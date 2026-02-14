import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { TelegramService } from './services/telegram.service';

@Module({
  imports: [SharedModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
