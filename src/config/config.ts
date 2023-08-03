import { Injectable, Optional } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export enum Process {
  DUMMY = 'ToDo',
}

export function GetConfig(): Configuration {
  return new Configuration();
}

export class Configuration {
  port = process.env.PORT ?? 3000;
  environment = process.env.ENVIRONMENT;
  version = 'v1';

  database: TypeOrmModuleOptions = {
    type: 'mssql',
    host: process.env.SQL_HOST,
    port: Number.parseInt(process.env.SQL_PORT),
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
