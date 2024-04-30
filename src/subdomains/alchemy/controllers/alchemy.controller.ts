import { Body, Controller, Post } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { AlchemyWebhookDto } from '../dto/alchemy-webhook.dto';
import { AlchemyWebhookService } from '../services/alchemy-webhook.service';

@ApiTags('Alchemy')
@Controller('alchemy')
export class AlchemyController {
  private readonly logger = new LightningLogger(AlchemyController);

  constructor(private readonly alchemyWebhookService: AlchemyWebhookService) {}

  @Post('addressWebhook')
  @ApiExcludeEndpoint()
  async addressWebhook(@Body() dto: AlchemyWebhookDto): Promise<void> {
    this.logger.info('Incoming addressWebhook ...');
    this.log(dto);

    const testDto = this.createTestDto();

    this.alchemyWebhookService.processAddressWebhook(testDto);
  }

  private log(dto: AlchemyWebhookDto) {
    try {
      if (dto) {
        this.logger.info(JSON.stringify(dto));
        this.logger.info('-'.repeat(80));
      }
    } catch (e) {
      this.logger.error('Incoming dto is not a JSON object', e);
    }
  }

  private createTestDto(): AlchemyWebhookDto {
    return {
      webhookId: 'wh_mkqqsz7ydb7cgc3b',
      id: 'whevt_mnqw6ho98y1wdg11',
      createdAt: '2024-04-24T10:10:14.795Z',
      type: 'ADDRESS_ACTIVITY',
      event: {
        network: 'MATIC_MAINNET',
        activity: [
          {
            fromAddress: '0x31559170038c77b0f36f895d8255c74f3464930b',
            toAddress: '0x0c2d40b49aa00a94e7479af1455651df0c1fb375',
            blockNum: '0x3597a6a',
            hash: '0x005b63953c189d2dd169d1b11e8d5371dae8963d8031a8a44ef57ba4ccdd90e4',
            value: 0.1,
            asset: 'ZCHF',
            category: 'token',
            rawContract: {
              rawValue: '0x000000000000000000000000000000000000000000000000016345785d8a0000',
              address: '0x02567e4b14b25549331fcee2b56c647a8bab16fd',
              decimals: 18,
            },
          },
        ],
      },
    };
  }
}
