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
import { SwapDto, SwapStatsQueryDto, SwapStatsResponseDto, SwapStatusFilter, SwapType } from '../dto/swap-stats.dto';

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

  // *** PUBLIC SWAP STATS *** //

  async getSwapStats(query: SwapStatsQueryDto): Promise<SwapStatsResponseDto> {
    const pool = this.getBoltzPool();
    const swaps: SwapDto[] = [];

    try {
      // Fetch chain swaps
      if (!query.type || query.type === SwapType.CHAIN) {
        const chainSwaps = await this.fetchChainSwaps(pool, query);
        swaps.push(...chainSwaps);
      }

      // Fetch submarine swaps (cBTC -> Lightning)
      if (!query.type || query.type === SwapType.SUBMARINE) {
        const submarineSwaps = await this.fetchSubmarineSwaps(pool, query);
        swaps.push(...submarineSwaps);
      }

      // Fetch reverse swaps (Lightning -> cBTC)
      if (!query.type || query.type === SwapType.REVERSE) {
        const reverseSwaps = await this.fetchReverseSwaps(pool, query);
        swaps.push(...reverseSwaps);
      }
    } catch (e) {
      this.logger.error(`Failed to fetch swap stats: ${e.message}`);
      throw new BadRequestException('Failed to fetch swap statistics');
    }

    // Sort by createdAt descending (handle invalid dates)
    swaps.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime() || 0;
      const dateB = new Date(b.createdAt).getTime() || 0;
      return dateB - dateA;
    });

    // Calculate stats (defensive null check for status)
    const claimed = swaps.filter((s) => s.status?.includes('claimed')).length;
    const expired = swaps.filter((s) => s.status?.includes('expired')).length;
    const refunded = swaps.filter((s) => s.status?.includes('refunded')).length;
    const pending = swaps.filter(
      (s) => s.status?.includes('created') || s.status?.includes('pending') || s.status?.includes('set'),
    ).length;
    const failed = swaps.filter((s) => s.status?.includes('failed')).length;

    return {
      total: swaps.length,
      claimed,
      expired,
      refunded,
      pending,
      failed,
      swaps,
    };
  }

  private async fetchChainSwaps(pool: Pool, query: SwapStatsQueryDto): Promise<SwapDto[]> {
    // Fetch chain swaps with their data
    const chainSwapsResult = await pool.query(`
      SELECT cs.*,
             sd_base.symbol as base_symbol, sd_base."lockupAddress" as base_lockup,
             sd_base."claimAddress" as base_claim, sd_base."expectedAmount" as base_expected,
             sd_base.amount as base_amount, sd_base."transactionId" as base_tx,
             sd_quote.symbol as quote_symbol, sd_quote."lockupAddress" as quote_lockup,
             sd_quote."claimAddress" as quote_claim, sd_quote."expectedAmount" as quote_expected,
             sd_quote.amount as quote_amount, sd_quote."transactionId" as quote_tx
      FROM "chainSwaps" cs
      LEFT JOIN "chainSwapData" sd_base ON cs.id = sd_base."swapId"
        AND sd_base.symbol = SPLIT_PART(cs.pair, '/', 1)
      LEFT JOIN "chainSwapData" sd_quote ON cs.id = sd_quote."swapId"
        AND sd_quote.symbol = SPLIT_PART(cs.pair, '/', 2)
      ORDER BY cs."createdAt" DESC
      LIMIT 1000
    `);

    return chainSwapsResult.rows
      .map((row) => this.mapChainSwap(row))
      .filter((swap) => this.matchesFilter(swap, query));
  }

  private async fetchSubmarineSwaps(pool: Pool, query: SwapStatsQueryDto): Promise<SwapDto[]> {
    // Submarine swaps: cBTC -> Lightning (user sends cBTC, receives Lightning payment)
    const result = await pool.query(`
      SELECT * FROM swaps
      WHERE pair = 'BTC/cBTC'
      ORDER BY "createdAt" DESC
      LIMIT 500
    `);

    return result.rows
      .map((row) => this.mapSubmarineSwap(row))
      .filter((swap) => this.matchesFilter(swap, query));
  }

  private async fetchReverseSwaps(pool: Pool, query: SwapStatsQueryDto): Promise<SwapDto[]> {
    // Reverse swaps: Lightning -> cBTC (user sends Lightning, receives cBTC)
    const result = await pool.query(`
      SELECT * FROM "reverseSwaps"
      WHERE pair = 'BTC/cBTC'
      ORDER BY "createdAt" DESC
      LIMIT 500
    `);

    return result.rows
      .map((row) => this.mapReverseSwap(row))
      .filter((swap) => this.matchesFilter(swap, query));
  }

  private mapChainSwap(row: Record<string, unknown>): SwapDto {
    const pair = row.pair as string;
    const [base, quote] = pair.split('/');
    const orderSide = row.orderSide as number;
    const direction = orderSide === 1 ? `${base} -> ${quote}` : `${quote} -> ${base}`;

    return {
      type: 'Chain Swap',
      id: row.id as string,
      pair,
      direction,
      status: (row.status as string) ?? '',
      failureReason: (row.failureReason as string) || undefined,
      fee: row.fee as string,
      referral: (row.referral as string) || undefined,
      createdAt: this.toIsoString(row.createdAt),
      updatedAt: this.toIsoString(row.updatedAt),
      sourceSymbol: orderSide === 1 ? base : quote,
      sourceAddress: (orderSide === 1 ? row.base_lockup : row.quote_lockup) as string,
      sourceExpectedAmount: (orderSide === 1 ? row.base_expected : row.quote_expected) as string,
      sourceAmount: (orderSide === 1 ? row.base_amount : row.quote_amount) as string,
      sourceTxId: (orderSide === 1 ? row.base_tx : row.quote_tx) as string,
      destSymbol: orderSide === 1 ? quote : base,
      destAddress: ((orderSide === 1 ? row.quote_claim || row.quote_lockup : row.base_claim || row.base_lockup) as string),
      destExpectedAmount: (orderSide === 1 ? row.quote_expected : row.base_expected) as string,
      destAmount: (orderSide === 1 ? row.quote_amount : row.base_amount) as string,
      destTxId: (orderSide === 1 ? row.quote_tx : row.base_tx) as string,
    };
  }

  private mapSubmarineSwap(row: Record<string, unknown>): SwapDto {
    const invoice = row.invoice as string;
    return {
      type: 'Submarine Swap',
      id: row.id as string,
      pair: row.pair as string,
      direction: 'cBTC -> Lightning',
      status: (row.status as string) ?? '',
      failureReason: (row.failureReason as string) || undefined,
      fee: row.fee as string,
      referral: (row.referral as string) || undefined,
      createdAt: this.toIsoString(row.createdAt),
      updatedAt: this.toIsoString(row.updatedAt),
      sourceSymbol: 'cBTC',
      sourceAddress: row.lockupAddress as string,
      sourceExpectedAmount: row.expectedAmount as string,
      sourceAmount: row.onchainAmount as string,
      sourceTxId: row.lockupTransactionId as string,
      destSymbol: 'Lightning',
      destAddress: invoice ? `${invoice.substring(0, 50)}...` : undefined,
      destExpectedAmount: row.invoiceAmount as string,
      destAmount: row.invoiceAmount as string,
      destTxId: undefined,
    };
  }

  private mapReverseSwap(row: Record<string, unknown>): SwapDto {
    const invoice = row.invoice as string;
    return {
      type: 'Reverse Swap',
      id: row.id as string,
      pair: row.pair as string,
      direction: 'Lightning -> cBTC',
      status: (row.status as string) ?? '',
      failureReason: (row.failureReason as string) || undefined,
      fee: row.fee as string,
      referral: (row.referral as string) || undefined,
      createdAt: this.toIsoString(row.createdAt),
      updatedAt: this.toIsoString(row.updatedAt),
      sourceSymbol: 'Lightning',
      sourceAddress: invoice ? `${invoice.substring(0, 50)}...` : undefined,
      sourceExpectedAmount: row.invoiceAmount as string,
      sourceAmount: row.invoiceAmount as string,
      sourceTxId: undefined,
      destSymbol: 'cBTC',
      destAddress: row.claimAddress as string,
      destExpectedAmount: row.onchainAmount as string,
      destAmount: row.onchainAmount as string,
      destTxId: row.transactionId as string,
    };
  }

  private toIsoString(value: unknown): string {
    if (!value) return '';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return new Date(value).toISOString();
    return '';
  }

  private matchesFilter(swap: SwapDto, query: SwapStatsQueryDto): boolean {
    if (query.pair && swap.pair !== query.pair) return false;
    if (query.direction && swap.direction !== query.direction) return false;
    if (query.status && query.status !== SwapStatusFilter.ALL) {
      return this.matchesStatusFilter(swap.status, query.status);
    }
    return true;
  }

  private matchesStatusFilter(status: string, filter: SwapStatusFilter): boolean {
    const s = (status ?? '').toLowerCase();
    const patterns: Record<SwapStatusFilter, string[]> = {
      [SwapStatusFilter.ALL]: [],
      [SwapStatusFilter.CLAIMED]: ['claimed'],
      [SwapStatusFilter.EXPIRED]: ['expired'],
      [SwapStatusFilter.REFUNDED]: ['refunded'],
      [SwapStatusFilter.PENDING]: ['created', 'pending', 'set'],
      [SwapStatusFilter.FAILED]: ['failed'],
    };
    return patterns[filter].some((p) => s.includes(p));
  }
}
