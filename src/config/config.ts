import { Injectable, Optional } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export enum Process {
  SYNC_ONCHAIN_TRANSACTIONS = 'SyncOnchainTransactions',
  SYNC_LIGHTNING_TRANSACTIONS = 'SyncLightningTransactions',
  SYNC_LIGHTNING_USER_TRANSACTIONS = 'SyncLightningUserTransactions',
  UPDATE_INVOICE = 'UpdateInvoice',
  UPDATE_WALLET_BALANCE = 'UpdateWalletBalance',
  UPDATE_LIGHTNING_USER_TRANSACTION = 'UpdateLightingUserTransaction',
}

export enum Environment {
  LOC = 'loc',
  DEV = 'dev',
  PRD = 'prd',
}

export function GetConfig(): Configuration {
  return new Configuration();
}

export class Configuration {
  port = process.env.PORT ?? 3000;
  environment: Environment = process.env.ENVIRONMENT as Environment;
  version = 'v1';

  dfxApiUrl = 'https://api.dfx.swiss/v1';

  database: TypeOrmModuleOptions = {
    type: 'mssql',
    host: process.env.SQL_HOST,
    port: Number.parseInt(process.env.SQL_PORT ?? '3000'),
    username: process.env.SQL_USERNAME,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB,
    entities: ['dist/**/*.entity{.ts,.js}'],
    autoLoadEntities: true,
    synchronize: process.env.SQL_SYNCHRONIZE === 'true',
    migrationsRun: process.env.SQL_MIGRATE === 'true',
    migrations: ['migration/*.js'],
    connectionTimeout: 30000,
    requestTimeout: 30000,
    logging: false,
  };

  auth = {
    jwt: {
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN ?? 172800,
      },
    },
    signMessage:
      'By_signing_this_message,_you_confirm_to_lightning.space_that_you_are_the_sole_owner_of_the_provided_Blockchain_address._Your_ID:_',
  };

  bitcoinAddressFormat =
    this.environment === Environment.PRD
      ? '([13]|bc1)[a-zA-HJ-NP-Z0-9]{25,62}'
      : '(([13]|bc1)[a-zA-HJ-NP-Z0-9]{25,62})|(tb(0([ac-hj-np-z02-9]{39}|[ac-hj-np-z02-9]{59})|1[ac-hj-np-z02-9]{8,87})|[mn2][a-km-zA-HJ-NP-Z1-9]{25,39})';

  formats = {
    address: new RegExp(`^(${this.bitcoinAddressFormat})$`),
    signature: /^(.{87}=)$/,
  };

  blockchain = {
    lightning: {
      lnbits: {
        adminUserId: process.env.LIGHTNING_LNBITS_ADMIN_USER_ID || '',
        adminKey: process.env.LIGHTNING_LNBITS_ADMIN_KEY || '',
        apiUrl: process.env.LIGHTNING_LNBITS_API_URL || '',
        lnurlpApiUrl: process.env.LIGHTNING_LNBITS_LNURLP_API_URL || '',
        lnurlpUrl: process.env.LIGHTNING_LNBITS_LNURLP_URL || '',
        lnurlwApiUrl: process.env.LIGHTNING_LNBITS_LNURLW_API_URL || '',
        lndhubUrl: process.env.LIGHTNING_LNBITS_LNDHUB_URL || '',
        usermanagerApiUrl: process.env.LIGHTNING_LNBITS_USERMANAGER_API_URL || '',
      },
      lnd: {
        apiUrl: process.env.LIGHTNING_LND_API_URL || '',
        adminMacaroon: process.env.LIGHTNING_LND_ADMIN_MACAROON || '',
        wsOnchainTransactionsUrl: process.env.LIGHTNING_LND_WS_ONCHAIN_TRANSACTIONS_URL || '',
        wsInvoicesUrl: process.env.LIGHTNING_LND_WS_INVOICES_URL || '',
        wsPaymentsUrl: process.env.LIGHTNING_LND_WS_PAYMENTS_URL || '',
      },
      certificate: process.env.LIGHTNING_API_CERTIFICATE?.split('<br>').join('\n'),
    },
  };

  processDisabled = (processName: Process) =>
    process.env.DISABLED_PROCESSES === '*' || (process.env.DISABLED_PROCESSES?.split(',') ?? []).includes(processName);

  // --- GETTERS --- //
  get baseUrl(): string {
    return this.environment === Environment.LOC
      ? `localhost:${this.port}`
      : `${this.environment === Environment.PRD ? '' : this.environment + '.'}lightning.space`;
  }

  get url(): string {
    return this.environment === Environment.LOC
      ? `http://${this.baseUrl}/${this.version}`
      : `https://${this.baseUrl}/${this.version}`;
  }
}

@Injectable()
export class ConfigService {
  constructor(@Optional() readonly config?: Configuration) {
    Config = config ?? GetConfig();
  }
}

export let Config: Configuration;
