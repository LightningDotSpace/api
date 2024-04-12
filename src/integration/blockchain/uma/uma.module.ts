import { Module, forwardRef } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { LightningForwardModule } from 'src/subdomains/lightning/lightning-forward.module';
import { UmaController } from 'src/subdomains/uma/controllers/uma.controller';
import { LightningModule } from '../lightning/lightning.module';
import { UmaService } from './services/uma.service';

@Module({
  imports: [SharedModule, LightningModule, forwardRef(() => LightningForwardModule)],
  controllers: [UmaController],
  providers: [UmaService],
  exports: [UmaService],
})
export class UmaModule {}
