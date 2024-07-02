import 'dotenv/config';

class Configuration {
  version = 'v1';

  port = +(process.env.PORT ?? 3000);
  host = process.env.HOST ?? 'localhost';

  walletAdminUser = process.env.WALLET_ADMIN_USER ?? '';

  sqlite = {
    mainDB: process.env.SQLITE3_DB ?? '',
    usermanagerDB: process.env.SQLITE3_EXT_USERMANAGER_DB ?? '',
    boltcardsDB: process.env.SQLITE3_EXT_BOLTCARDS_DB ?? '',
    boltcardsCompareDB: process.env.SQLITE3_BOLTCARDS_COMPARE_DB ?? '',
  };

  apiPaymentJson = process.env.API_PAYMENT_JSON ?? '';
  boltcardJson = process.env.BOLTCARD_JSON ?? '';

  httpSignature = {
    privKey: process.env.HTTP_SIGNATURE_PRIV_KEY?.split('<br>').join('\n') ?? '',
    pubKey: process.env.HTTP_SIGNATURE_PUB_KEY?.split('<br>').join('\n') ?? '',
  };

  transactionWebhookUrl = process.env.TRANSACTION_WEBHOOK_URL ?? '';
  boltcardWebhookUrl = process.env.BOLTCARD_WEBHOOK_URL ?? '';
}

export const Config: Configuration = new Configuration();
