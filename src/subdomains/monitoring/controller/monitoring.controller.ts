import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Util } from 'src/shared/utils/util';
import { AlchemyWebhookDto } from 'src/subdomains/alchemy/dto/alchemy-webhook.dto';
import { MonitoringFrankencoinDto } from '../dto/monitoring-frankencoin.dto';
import { MonitoringService } from '../services/monitoring.service';

@ApiTags('Monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Post('frankencoin-monitoring-webhook')
  @ApiExcludeEndpoint()
  async frankencoinMonitoringWebhook(
    @Headers('X-Alchemy-Signature') alchemySignature: string,
    @Body() dto: AlchemyWebhookDto,
  ): Promise<void> {
    const signingKey = await this.monitoringService.getWebhookSigningKey(dto.webhookId);
    if (!signingKey) return;

    const checkSignature = Util.createHmac(signingKey, JSON.stringify(dto));

    if (alchemySignature === checkSignature) {
      await this.monitoringService.processFrankencoinMonitoring(dto);
    }
  }

  @Get('frankencoin-info')
  async frankencoinInfo(): Promise<MonitoringFrankencoinDto> {
    return this.monitoringService.frankencoinInfo();
  }
}
