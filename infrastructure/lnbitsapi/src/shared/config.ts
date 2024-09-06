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

    compareApiPaymentsDB: process.env.SQLITE3_COMPARE_APIPAYMENTS_DB ?? '',
    compareBoltcardsDB: process.env.SQLITE3_COMPARE_BOLTCARDS_DB ?? '',
  };

  compare = {
    apiPaymentsJson: process.env.COMPARE_APIPAYMENTS_JSON ?? '',
    boltcardsJson: process.env.COMPARE_BOLTCARDS_JSON ?? '',
  };

  httpSignature = {
    privKey: process.env.HTTP_SIGNATURE_PRIV_KEY?.split('<br>').join('\n') ?? '',
    pubKey: process.env.HTTP_SIGNATURE_PUB_KEY?.split('<br>').join('\n') ?? '',
  };

  transactionWebhookUrl = process.env.TRANSACTION_WEBHOOK_URL ?? '';
  boltcardWebhookUrl = process.env.BOLTCARD_WEBHOOK_URL ?? '';
}

export const Config: Configuration = new Configuration();
