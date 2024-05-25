import 'dotenv/config';

class Configuration {
  version = 'v1';

  port = +(process.env.PORT ?? 3000);
  host = process.env.HOST ?? 'localhost';

  walletAdminUser = process.env.WALLET_ADMIN_USER ?? '';

  sqlite = {
    mainDB: process.env.SQLITE3_DB ?? '',
    usermanagerDB: process.env.SQLITE3_EXT_USERMANAGER_DB ?? '',
  };

  apiPaymentJson = process.env.API_PAYMENT_JSON ?? '';

  httpSignature = {
    privKey: process.env.HTTP_SIGNATURE_PRIV_KEY?.split('<br>').join('\n') ?? '',
    pubKey: process.env.HTTP_SIGNATURE_PUB_KEY?.split('<br>').join('\n') ?? '',
  };

  webhookUrl = process.env.WEBHOOK_URL ?? '';
}

export const Config: Configuration = new Configuration();
