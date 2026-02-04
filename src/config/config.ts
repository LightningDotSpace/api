import { Injectable, Optional } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export enum Process {
  SYNC_ONCHAIN_TRANSACTIONS = 'SyncOnchainTransactions',
  SYNC_LIGHTNING_TRANSACTIONS = 'SyncLightningTransactions',
  SYNC_LIGHTNING_USER_TRANSACTIONS = 'SyncLightningUserTransactions',
  UPDATE_INVOICE = 'UpdateInvoice',
  UPDATE_WALLET_BALANCE = 'UpdateWalletBalance',
  UPDATE_LIGHTNING_USER_TRANSACTION = 'UpdateLightingUserTransaction',
  UPDATE_PAYMENT_REQUEST = 'UpdatePaymentRequest',
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

  azureIpSubstring = '169.254';

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
  ethereumAddressFormat = '0x\\w{40}';

  allAddressFormat = `${this.bitcoinAddressFormat}|${this.ethereumAddressFormat}`;

  bitcoinSignatureFormat = '(.{87}=)$';

  ethereumSignatureFormat = '(0x)?[a-f0-9]{130}';

  allSignatureFormat = `${this.bitcoinSignatureFormat}|${this.ethereumSignatureFormat}`;

  formats = {
    address: new RegExp(`^(${this.allAddressFormat})$`),
    signature: new RegExp(`^(${this.allSignatureFormat})$`),
  };

  payment = {
    timeout: +(process.env.PAYMENT_TIMEOUT ?? 60),
    timeoutDelay: +(process.env.PAYMENT_TIMEOUT_DELAY ?? 10),

    evmAddress: process.env.PAYMENT_EVM_ADDRESS ?? '',
  };

  blockchain = {
    bitcoin: {
      gatewayUrl: process.env.BITCOIN_GATEWAY_URL ?? '',
      rpcUser: process.env.BITCOIN_RPC_USER ?? '',
      rpcPassword: process.env.BITCOIN_RPC_PASSWORD ?? '',
    },
    lightning: {
      lnbits: {
        adminUserId: process.env.LIGHTNING_LNBITS_ADMIN_USER_ID ?? '',
        adminKey: process.env.LIGHTNING_LNBITS_ADMIN_KEY ?? '',
        extensions: process.env.LIGHTNING_LNBITS_EXTENSIONS?.split(',') ?? [],
        internalWalletIds: process.env.LIGHTNING_LNBITS_INTERNAL_WALLET_IDS?.split(',') ?? [],
        apiUrl: process.env.LIGHTNING_LNBITS_API_URL ?? '',
        extensionManagementApiUrl: process.env.LIGHTNING_LNBITS_EXTENSION_MANAGEMENT_API_URL ?? '',
        lnurlpApiUrl: process.env.LIGHTNING_LNBITS_LNURLP_API_URL ?? '',
        lnurlpUrl: process.env.LIGHTNING_LNBITS_LNURLP_URL ?? '',
        lnurlwApiUrl: process.env.LIGHTNING_LNBITS_LNURLW_API_URL ?? '',
        lndhubUrl: process.env.LIGHTNING_LNBITS_LNDHUB_URL ?? '',
        usermanagerApiUrl: process.env.LIGHTNING_LNBITS_USERMANAGER_API_URL ?? '',
        boltcardsApiUrl: process.env.LIGHTNING_LNBITS_BOLTCARDS_API_URL ?? '',
      },
      lnd: {
        apiUrl: process.env.LIGHTNING_LND_API_URL ?? '',
        adminMacaroon: process.env.LIGHTNING_LND_ADMIN_MACAROON ?? '',
        wsOnchainTransactionsUrl: process.env.LIGHTNING_LND_WS_ONCHAIN_TRANSACTIONS_URL ?? '',
        wsInvoicesUrl: process.env.LIGHTNING_LND_WS_INVOICES_URL ?? '',
        wsPaymentsUrl: process.env.LIGHTNING_LND_WS_PAYMENTS_URL ?? '',
      },
      certificate: process.env.LIGHTNING_API_CERTIFICATE?.split('<br>').join('\n'),
      lnbitsapi: {
        apiUrl: process.env.LIGHTNING_LNBITSAPI_API_URL ?? '',
        certificate: process.env.LIGHTNING_LNBITSAPI_CERTIFICATE?.split('<br>').join('\n') ?? '',
      },
    },
    ethereum: {
      gatewayUrl: process.env.ETHEREUM_GATEWAY_URL ?? '',
      apiKey: process.env.ALCHEMY_API_KEY ?? '',
      chainId: +(process.env.ETHEREUM_CHAIN_ID ?? -1),
      walletAddress: process.env.EVM_PAYMENT_ADDRESS ?? '',
    },
    arbitrum: {
      gatewayUrl: process.env.ARBITRUM_GATEWAY_URL ?? '',
      apiKey: process.env.ALCHEMY_API_KEY ?? '',
      chainId: +(process.env.ARBITRUM_CHAIN_ID ?? -1),
      walletAddress: process.env.EVM_PAYMENT_ADDRESS ?? '',
    },
    optimism: {
      gatewayUrl: process.env.OPTIMISM_GATEWAY_URL ?? '',
      apiKey: process.env.ALCHEMY_API_KEY ?? '',
      chainId: +(process.env.OPTIMISM_CHAIN_ID ?? -1),
      walletAddress: process.env.EVM_PAYMENT_ADDRESS ?? '',
    },
    polygon: {
      gatewayUrl: process.env.POLYGON_GATEWAY_URL ?? '',
      apiKey: process.env.ALCHEMY_API_KEY ?? '',
      chainId: +(process.env.POLYGON_CHAIN_ID ?? -1),
      walletAddress: process.env.EVM_PAYMENT_ADDRESS ?? '',
    },
    base: {
      gatewayUrl: process.env.BASE_GATEWAY_URL ?? '',
      apiKey: process.env.ALCHEMY_API_KEY ?? '',
      chainId: +(process.env.BASE_CHAIN_ID ?? -1),
      walletAddress: process.env.EVM_PAYMENT_ADDRESS ?? '',
    },
    rootstock: {
      gatewayUrl: process.env.ROOTSTOCK_GATEWAY_URL ?? '',
      apiKey: process.env.ALCHEMY_API_KEY ?? '',
      chainId: +(process.env.ROOTSTOCK_CHAIN_ID ?? -1),
    },
    citrea: {
      gatewayUrl: process.env.CITREA_GATEWAY_URL ?? '',
      chainId: +(process.env.CITREA_CHAIN_ID ?? -1),
    },
  };

  evm = {
    walletSeed: process.env.EVM_WALLET_SEED ?? '',
  };

  alchemy = {
    apiKey: process.env.ALCHEMY_API_KEY,
    authToken: process.env.ALCHEMY_AUTH_TOKEN,
  };

  uma = {
    signingPrivKey: process.env.UMA_SIGNING_PRIV_KEY ?? '',
    signingPubKey: process.env.UMA_SIGNING_PUB_KEY ?? '',
    encryptionPubKey: process.env.UMA_ENCRYPTION_PUB_KEY ?? '',
  };

  coinGecko = {
    apiKey: process.env.COIN_GECKO_API_KEY,
  };

  azure = {
    appInsights: {
      appId: process.env.AZURE_APP_INSIGHTS_APP_ID ?? '',
      apiKey: process.env.AZURE_APP_INSIGHTS_API_KEY ?? '',
    },
  };

  boltzPostgres = {
    host: process.env.BOLTZ_PG_HOST ?? '',
    port: parseInt(process.env.BOLTZ_PG_PORT ?? '5432'),
    database: process.env.BOLTZ_PG_DATABASE ?? '',
    user: process.env.BOLTZ_PG_USER ?? '',
    password: process.env.BOLTZ_PG_PASSWORD ?? '',
  };

  ponderPostgres = {
    host: process.env.PONDER_PG_HOST ?? '',
    port: parseInt(process.env.PONDER_PG_PORT ?? '5432'),
    database: process.env.PONDER_PG_DATABASE ?? '',
    user: process.env.PONDER_PG_USER ?? '',
    password: process.env.PONDER_PG_PASSWORD ?? '',
  };

  request = {
    knownIps: process.env.REQUEST_KNOWN_IPS?.split(',') ?? [],
    limitCheck: process.env.REQUEST_LIMIT_CHECK === 'true',
  };

  swap = {
    apiUrl: process.env.SWAP_API_URL,
    claimApiUrl: process.env.SWAP_CLAIM_API_URL,
  };

  boltz = {
    walletAddress: process.env.BOLTZ_WALLET_ADDRESS ?? '',
  };

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

  // --- HELPERS --- //
  processDisabled = (processName: Process) =>
    process.env.DISABLED_PROCESSES === '*' || (process.env.DISABLED_PROCESSES?.split(',') ?? []).includes(processName);
}

@Injectable()
export class ConfigService {
  constructor(@Optional() readonly config?: Configuration) {
    Config = config ?? GetConfig();
  }
}

export let Config: Configuration;
