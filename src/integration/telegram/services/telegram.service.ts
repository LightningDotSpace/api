import { Injectable } from '@nestjs/common';
import { Config } from 'src/config/config';
import { HttpService } from 'src/shared/services/http.service';
import { LightningLogger } from 'src/shared/services/lightning-logger';

interface TelegramSendMessageResponse {
  ok: boolean;
  result?: {
    message_id: number;
  };
  description?: string;
}

@Injectable()
export class TelegramService {
  private readonly logger = new LightningLogger(TelegramService);
  private readonly baseUrl = 'https://api.telegram.org';

  constructor(private readonly httpService: HttpService) {}

  async sendMessage(message: string): Promise<boolean> {
    if (!Config.telegram.botToken || !Config.telegram.chatId) {
      this.logger.info('Telegram not configured, skipping message');
      return false;
    }

    try {
      const url = `${this.baseUrl}/bot${Config.telegram.botToken}/sendMessage`;
      const response = await this.httpService.post<TelegramSendMessageResponse>(
        url,
        {
          chat_id: Config.telegram.chatId,
          text: message,
          parse_mode: 'HTML',
        },
        { tryCount: 5, retryDelay: 2000 },
      );

      if (!response.ok) {
        this.logger.error(`Telegram API error: ${response.description}`);
        return false;
      }

      return true;
    } catch (e) {
      this.logger.error('Failed to send Telegram message', e);
      return false;
    }
  }
}
