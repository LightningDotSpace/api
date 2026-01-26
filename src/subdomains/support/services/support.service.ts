import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { Config } from 'src/config/config';
import { AppInsightsQueryService } from 'src/shared/services/app-insights-query.service';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { DataSource } from 'typeorm';
import { BoltzDebugConfig } from '../dto/boltz-debug.config';
import { DbQueryDto } from '../dto/db-query.dto';
import { DebugLogQueryTemplates, MssqlDebugConfig } from '../dto/debug.config';
import { LogQueryDto, LogQueryResult } from '../dto/log-query.dto';
import { SqlQueryValidator } from './sql-query-validator';

@Injectable()
export class SupportService implements OnModuleDestroy {
  private readonly logger = new LightningLogger(SupportService);
  private readonly sqlValidator = new SqlQueryValidator();
  private boltzPool: Pool | null = null;

  constructor(
    private readonly dataSource: DataSource,
    private readonly appInsightsQueryService: AppInsightsQueryService,
  ) {}

  async onModuleDestroy(): Promise<void> {
    if (this.boltzPool) {
      await this.boltzPool.end();
    }
  }

  private getBoltzPool(): Pool {
    if (!this.boltzPool) {
      const pgConfig = Config.boltzPostgres;
      if (!pgConfig.host || !pgConfig.database) {
        throw new BadRequestException('Boltz PostgreSQL not configured');
      }
      this.boltzPool = new Pool({
        host: pgConfig.host,
        port: pgConfig.port,
        database: pgConfig.database,
        user: pgConfig.user,
        password: pgConfig.password,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    }
    return this.boltzPool;
  }

  async getRawData(query: DbQueryDto): Promise<any> {
    const request = this.dataSource
      .createQueryBuilder()
      .from(query.table, query.table)
      .orderBy(`${query.table}.id`, query.sorting)
      .limit(query.maxLine)
      .where(`${query.table}.id >= :id`, { id: query.min })
      .andWhere(`${query.table}.updated >= :updated`, { updated: query.updatedSince });

    if (query.select) request.select(query.select);

    for (const where of query.where) {
      request.andWhere(where[0], where[1]);
    }

    for (const join of query.join) {
      request.leftJoin(join[0], join[1]);
    }

    const data = await request.getRawMany().catch((e: Error) => {
      throw new BadRequestException(e.message);
    });

    // transform to array
    return this.transformResultArray(data, query.table);
  }

  async executeDebugQuery(sql: string, userIdentifier: string): Promise<Record<string, unknown>[]> {
    // Validate query using shared validator
    const { tables } = this.sqlValidator.validateQuery(sql, MssqlDebugConfig);

    // Log query for audit trail
    this.logger.verbose(`Debug query by ${userIdentifier}: ${sql.substring(0, 500)}${sql.length > 500 ? '...' : ''}`);

    // Execute query with result limit
    try {
      const limitedSql = this.sqlValidator.ensureResultLimit(sql, MssqlDebugConfig);
      const result = await this.dataSource.query(limitedSql);

      // Post-execution masking (defense in depth)
      this.sqlValidator.maskBlockedColumns(result, tables, MssqlDebugConfig);

      return result;
    } catch (e) {
      this.logger.info(`Debug query by ${userIdentifier} failed: ${e.message}`);
      throw new BadRequestException('Query execution failed');
    }
  }

  async executeLogQuery(dto: LogQueryDto, userIdentifier: string): Promise<LogQueryResult> {
    const template = DebugLogQueryTemplates[dto.template];
    if (!template) {
      throw new BadRequestException('Unknown template');
    }

    // Validate required params
    for (const param of template.requiredParams) {
      if (!dto[param]) {
        throw new BadRequestException(`Parameter '${param}' is required for template '${dto.template}'`);
      }
    }

    // Build KQL with safe parameter substitution
    let kql = template.kql;
    kql = kql.replace('{operationId}', this.escapeKqlString(dto.operationId ?? ''));
    kql = kql.replace('{messageFilter}', this.escapeKqlString(dto.messageFilter ?? ''));
    kql = kql.replaceAll('{hours}', String(dto.hours ?? 1));
    kql = kql.replace('{durationMs}', String(dto.durationMs ?? 1000));
    kql = kql.replace('{eventName}', this.escapeKqlString(dto.eventName ?? ''));

    // Add limit
    kql += `\n| take ${template.defaultLimit}`;

    // Log for audit
    this.logger.verbose(`Log query by ${userIdentifier}: template=${dto.template}, params=${JSON.stringify(dto)}`);

    // Execute
    const timespan = `PT${dto.hours ?? 1}H`;

    try {
      const response = await this.appInsightsQueryService.query(kql, timespan);

      if (!response.tables?.length) {
        return { columns: [], rows: [] };
      }

      return {
        columns: response.tables[0].columns,
        rows: response.tables[0].rows,
      };
    } catch (e) {
      this.logger.info(`Log query by ${userIdentifier} failed: ${e.message}`);
      throw new BadRequestException('Query execution failed');
    }
  }

  async executeBoltzQuery(sql: string, userIdentifier: string): Promise<Record<string, unknown>[]> {
    // Validate query using shared validator
    const { tables } = this.sqlValidator.validateQuery(sql, BoltzDebugConfig);

    // Log query for audit trail
    this.logger.verbose(`Boltz query by ${userIdentifier}: ${sql.substring(0, 500)}${sql.length > 500 ? '...' : ''}`);

    // Execute query with result limit
    try {
      const limitedSql = this.sqlValidator.ensureResultLimit(sql, BoltzDebugConfig);
      const pool = this.getBoltzPool();
      const result = await pool.query(limitedSql);

      // Post-execution masking (defense in depth)
      this.sqlValidator.maskBlockedColumns(result.rows, tables, BoltzDebugConfig);

      return result.rows;
    } catch (e) {
      this.logger.info(`Boltz query by ${userIdentifier} failed: ${e.message}`);
      throw new BadRequestException('Query execution failed');
    }
  }

  //*** HELPER METHODS ***//

  private escapeKqlString(value: string): string {
    return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  }

  private transformResultArray(
    data: any[],
    table: string,
  ):
    | {
        keys: string[];
        values: any;
      }
    | undefined {
    // transform to array
    return data.length > 0
      ? {
          keys: this.renameDbKeys(table, Object.keys(data[0])),
          values: data.map((e) => Object.values(e)),
        }
      : undefined;
  }

  private renameDbKeys(table: string, keys: string[]): string[] {
    return keys.map((k) => k.replace(`${table}_`, '')).map((k) => (k.includes('_') ? this.toDotSeparation(k) : k));
  }

  private toDotSeparation(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1).split('_').join('.');
  }

}
