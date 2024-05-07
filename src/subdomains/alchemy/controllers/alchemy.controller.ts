import { Body, Controller, Post } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { AlchemyWebhookDto } from '../dto/alchemy-webhook.dto';
import { AlchemyWebhookService } from '../services/alchemy-webhook.service';

@ApiTags('Alchemy')
@Controller('alchemy')
export class AlchemyController {
  constructor(private readonly alchemyWebhookService: AlchemyWebhookService) {}

  @Post('address-webhook')
  @ApiExcludeEndpoint()
  async addressWebhook(@Body() dto: AlchemyWebhookDto): Promise<void> {
    this.alchemyWebhookService.processAddressWebhook(dto);
  }
}
