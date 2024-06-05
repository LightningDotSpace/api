import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { AlchemyWebhookDto } from 'src/subdomains/alchemy/dto/alchemy-webhook.dto';
import { AlchemyWebhookService } from 'src/subdomains/alchemy/services/alchemy-webhook.service';
import { MonitoringFrankencoinDto } from '../dto/monitoring-frankencoin.dto';
import { MonitoringService } from '../services/monitoring.service';

@ApiTags('Monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly alchemyWebhookService: AlchemyWebhookService,
    private readonly monitoringService: MonitoringService,
  ) {}

  @Post('frankencoin-monitoring-webhook')
  @ApiExcludeEndpoint()
  async frankencoinMonitoringWebhook(
    @Headers('X-Alchemy-Signature') alchemySignature: string,
    @Body() dto: AlchemyWebhookDto,
  ): Promise<void> {
    if (this.alchemyWebhookService.isValidWebhookSignature(alchemySignature, dto)) {
      return this.monitoringService.processFrankencoinMonitoring();
    }
  }

  @Get('frankencoin-info')
  async frankencoinInfo(): Promise<MonitoringFrankencoinDto> {
    return this.monitoringService.frankencoinInfo();
  }
}
