import { BadRequestException, Injectable } from '@nestjs/common';
import { Parser } from 'node-sql-parser';
import { AppInsightsQueryService } from 'src/shared/services/app-insights-query.service';
import { LightningLogger } from 'src/shared/services/lightning-logger';
import { DataSource } from 'typeorm';
import { DbQueryDto } from '../dto/db-query.dto';
import {
  DebugBlockedCols,
  DebugBlockedSchemas,
  DebugDangerousFunctions,
  DebugLogQueryTemplates,
  DebugMaxResults,
} from '../dto/debug.config';
import { LogQueryDto, LogQueryResult } from '../dto/log-query.dto';

@Injectable()
export class SupportService {
  private readonly logger = new LightningLogger(SupportService);
  private readonly sqlParser = new Parser();

  constructor(
    private readonly dataSource: DataSource,
    private readonly appInsightsQueryService: AppInsightsQueryService,
  ) {}

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
    // 1. Parse SQL to AST for robust validation
    let ast;
    try {
      ast = this.sqlParser.astify(sql, { database: 'TransactSQL' });
    } catch {
      throw new BadRequestException('Invalid SQL syntax');
    }

    // 2. Only single SELECT statements allowed (array means multiple statements)
    const statements = Array.isArray(ast) ? ast : [ast];
    if (statements.length !== 1) {
      throw new BadRequestException('Only single statements allowed');
    }

    const stmt = statements[0];
    if (stmt.type !== 'select') {
      throw new BadRequestException('Only SELECT queries allowed');
    }

    // 3. No UNION/INTERSECT/EXCEPT queries (these have _next property)
    if (stmt._next) {
      throw new BadRequestException('UNION/INTERSECT/EXCEPT queries not allowed');
    }

    // 4. No SELECT INTO (creates tables - write operation!)
    if (stmt.into?.type === 'into' || stmt.into?.expr) {
      throw new BadRequestException('SELECT INTO not allowed');
    }

    // 5. No system tables/schemas (prevent access to sys.*, INFORMATION_SCHEMA.*, etc.)
    this.checkForBlockedSchemas(stmt);

    // 6. No dangerous functions anywhere in the query (external connections)
    this.checkForDangerousFunctionsRecursive(stmt);

    // 7. No FOR XML/JSON (data exfiltration) - check recursively including subqueries
    this.checkForXmlJsonRecursive(stmt);

    // 8. Check for blocked columns BEFORE execution (prevents alias bypass)
    const tables = this.getTablesFromQuery(sql);
    const blockedColumn = this.findBlockedColumnInQuery(sql, stmt, tables);
    if (blockedColumn) {
      throw new BadRequestException(`Access to column '${blockedColumn}' is not allowed`);
    }

    // 9. Validate TOP value if present (use AST for accurate detection including TOP(n) syntax)
    if (stmt.top?.value > DebugMaxResults) {
      throw new BadRequestException(`TOP value exceeds maximum of ${DebugMaxResults}`);
    }

    // 10. Log query for audit trail
    this.logger.verbose(`Debug query by ${userIdentifier}: ${sql.substring(0, 500)}${sql.length > 500 ? '...' : ''}`);

    // 11. Execute query with result limit
    try {
      const limitedSql = this.ensureResultLimit(sql);
      const result = await this.dataSource.query(limitedSql);

      // 12. Post-execution masking (defense in depth - also catches pre-execution failures)
      this.maskDebugBlockedColumns(result, tables);

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

  // --- DEBUG QUERY HELPER METHODS --- //

  private getTablesFromQuery(sql: string): string[] {
    const tableList = this.sqlParser.tableList(sql, { database: 'TransactSQL' });
    // Format: 'select::null::table_name' → extract table_name
    return tableList.map((t) => t.split('::')[2]).filter(Boolean);
  }

  private getAliasToTableMap(ast: any): Map<string, string> {
    const map = new Map<string, string>();
    if (!ast.from) return map;

    for (const item of ast.from) {
      if (item.table) {
        map.set(item.as || item.table, item.table);
      }
    }
    return map;
  }

  private resolveTableFromAlias(
    tableOrAlias: string,
    tables: string[],
    aliasMap: Map<string, string>,
  ): string | null {
    if (tableOrAlias === 'null') {
      return tables.length === 1 ? tables[0] : null;
    }
    return aliasMap.get(tableOrAlias) || tableOrAlias;
  }

  private isColumnBlockedInTable(columnName: string, table: string | null, allTables: string[]): boolean {
    const lower = columnName.toLowerCase();

    if (table) {
      const blockedCols = DebugBlockedCols[table];
      return blockedCols?.some((b) => b.toLowerCase() === lower) ?? false;
    } else {
      return allTables.some((t) => {
        const blockedCols = DebugBlockedCols[t];
        return blockedCols?.some((b) => b.toLowerCase() === lower) ?? false;
      });
    }
  }

  private findBlockedColumnInQuery(sql: string, ast: any, tables: string[]): string | null {
    try {
      const columns = this.sqlParser.columnList(sql, { database: 'TransactSQL' });
      const aliasMap = this.getAliasToTableMap(ast);

      for (const col of columns) {
        const parts = col.split('::');
        const tableOrAlias = parts[1];
        const columnName = parts[2];

        if (columnName === '*' || columnName === '(.*)') continue;

        const resolvedTable = this.resolveTableFromAlias(tableOrAlias, tables, aliasMap);

        if (this.isColumnBlockedInTable(columnName, resolvedTable, tables)) {
          return `${resolvedTable || 'unknown'}.${columnName}`;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private checkForBlockedSchemas(stmt: any): void {
    if (!stmt) return;

    if (stmt.from) {
      for (const item of stmt.from) {
        if (item.server) {
          throw new BadRequestException('Linked server access is not allowed');
        }

        const schema = item.db?.toLowerCase() || item.schema?.toLowerCase();
        const table = item.table?.toLowerCase();

        if (schema && DebugBlockedSchemas.includes(schema)) {
          throw new BadRequestException(`Access to schema '${schema}' is not allowed`);
        }

        if (table && DebugBlockedSchemas.some((s) => table.startsWith(s + '.'))) {
          throw new BadRequestException(`Access to system tables is not allowed`);
        }

        if (item.expr?.ast) {
          this.checkForBlockedSchemas(item.expr.ast);
        }

        this.checkSubqueriesForBlockedSchemas(item.on);
      }
    }

    if (stmt.columns) {
      for (const col of stmt.columns) {
        this.checkSubqueriesForBlockedSchemas(col.expr);
      }
    }

    this.checkSubqueriesForBlockedSchemas(stmt.where);
    this.checkSubqueriesForBlockedSchemas(stmt.having);

    if (stmt.orderby) {
      for (const item of stmt.orderby) {
        this.checkSubqueriesForBlockedSchemas(item.expr);
      }
    }

    if (stmt.groupby?.columns) {
      for (const item of stmt.groupby.columns) {
        this.checkSubqueriesForBlockedSchemas(item);
      }
    }

    if (stmt.with) {
      for (const cte of stmt.with) {
        if (cte.stmt?.ast) {
          this.checkForBlockedSchemas(cte.stmt.ast);
        }
      }
    }
  }

  private checkSubqueriesForBlockedSchemas(node: any): void {
    if (!node) return;

    if (node.ast) {
      this.checkForBlockedSchemas(node.ast);
    }

    if (node.left) this.checkSubqueriesForBlockedSchemas(node.left);
    if (node.right) this.checkSubqueriesForBlockedSchemas(node.right);
    if (node.expr) this.checkSubqueriesForBlockedSchemas(node.expr);

    if (node.result) this.checkSubqueriesForBlockedSchemas(node.result);
    if (node.condition) this.checkSubqueriesForBlockedSchemas(node.condition);

    if (node.args) {
      const args = Array.isArray(node.args) ? node.args : node.args?.value || [];
      for (const arg of Array.isArray(args) ? args : [args]) {
        this.checkSubqueriesForBlockedSchemas(arg);
      }
    }
    if (node.value && Array.isArray(node.value)) {
      for (const val of node.value) {
        this.checkSubqueriesForBlockedSchemas(val);
      }
    }

    if (node.over?.as_window_specification?.window_specification) {
      const winSpec = node.over.as_window_specification.window_specification;
      if (winSpec.orderby) {
        for (const item of winSpec.orderby) {
          this.checkSubqueriesForBlockedSchemas(item.expr);
        }
      }
      if (winSpec.partitionby) {
        for (const item of winSpec.partitionby) {
          this.checkSubqueriesForBlockedSchemas(item);
        }
      }
    }
  }

  private checkForDangerousFunctionsRecursive(stmt: any): void {
    if (!stmt) return;

    this.checkFromForDangerousFunctions(stmt.from);
    this.checkExpressionsForDangerousFunctions(stmt.columns);
    this.checkNodeForDangerousFunctions(stmt.where);
    this.checkNodeForDangerousFunctions(stmt.having);

    if (stmt.orderby) {
      for (const item of stmt.orderby) {
        this.checkNodeForDangerousFunctions(item.expr);
      }
    }

    if (stmt.groupby?.columns) {
      for (const item of stmt.groupby.columns) {
        this.checkNodeForDangerousFunctions(item);
      }
    }

    if (stmt.with) {
      for (const cte of stmt.with) {
        if (cte.stmt?.ast) {
          this.checkForDangerousFunctionsRecursive(cte.stmt.ast);
        }
      }
    }
  }

  private checkFromForDangerousFunctions(from: any[]): void {
    if (!from) return;

    for (const item of from) {
      if (item.type === 'expr' && item.expr?.type === 'function') {
        const funcName = this.extractFunctionName(item.expr);
        if (funcName && DebugDangerousFunctions.includes(funcName)) {
          throw new BadRequestException(`Function '${funcName.toUpperCase()}' not allowed`);
        }
      }

      if (item.expr?.ast) {
        this.checkForDangerousFunctionsRecursive(item.expr.ast);
      }

      this.checkNodeForDangerousFunctions(item.on);
    }
  }

  private checkExpressionsForDangerousFunctions(columns: any[]): void {
    if (!columns) return;

    for (const col of columns) {
      this.checkNodeForDangerousFunctions(col.expr);
    }
  }

  private checkNodeForDangerousFunctions(node: any): void {
    if (!node) return;

    if (node.type === 'function') {
      const funcName = this.extractFunctionName(node);
      if (funcName && DebugDangerousFunctions.includes(funcName)) {
        throw new BadRequestException(`Function '${funcName.toUpperCase()}' not allowed`);
      }
    }

    if (node.ast) {
      this.checkForDangerousFunctionsRecursive(node.ast);
    }

    if (node.left) this.checkNodeForDangerousFunctions(node.left);
    if (node.right) this.checkNodeForDangerousFunctions(node.right);
    if (node.expr) this.checkNodeForDangerousFunctions(node.expr);

    if (node.result) this.checkNodeForDangerousFunctions(node.result);
    if (node.condition) this.checkNodeForDangerousFunctions(node.condition);

    if (node.args) {
      const args = Array.isArray(node.args) ? node.args : node.args?.value || [];
      for (const arg of Array.isArray(args) ? args : [args]) {
        this.checkNodeForDangerousFunctions(arg);
      }
    }
    if (node.value && Array.isArray(node.value)) {
      for (const val of node.value) {
        this.checkNodeForDangerousFunctions(val);
      }
    }

    if (node.over?.as_window_specification?.window_specification) {
      const winSpec = node.over.as_window_specification.window_specification;
      if (winSpec.orderby) {
        for (const item of winSpec.orderby) {
          this.checkNodeForDangerousFunctions(item.expr);
        }
      }
      if (winSpec.partitionby) {
        for (const item of winSpec.partitionby) {
          this.checkNodeForDangerousFunctions(item);
        }
      }
    }
  }

  private extractFunctionName(funcNode: any): string | null {
    if (funcNode.name?.name?.[0]?.value) {
      return funcNode.name.name[0].value.toLowerCase();
    }
    if (typeof funcNode.name === 'string') {
      return funcNode.name.toLowerCase();
    }
    return null;
  }

  private checkForXmlJsonRecursive(stmt: any): void {
    if (!stmt) return;

    const forType = stmt.for?.type?.toLowerCase();
    if (forType?.includes('xml') || forType?.includes('json')) {
      throw new BadRequestException('FOR XML/JSON not allowed');
    }

    if (stmt.columns) {
      for (const col of stmt.columns) {
        this.checkNodeForXmlJson(col.expr);
      }
    }

    if (stmt.from) {
      for (const item of stmt.from) {
        if (item.expr?.ast) {
          this.checkForXmlJsonRecursive(item.expr.ast);
        }
        this.checkNodeForXmlJson(item.on);
      }
    }

    this.checkNodeForXmlJson(stmt.where);
    this.checkNodeForXmlJson(stmt.having);

    if (stmt.orderby) {
      for (const item of stmt.orderby) {
        this.checkNodeForXmlJson(item.expr);
      }
    }

    if (stmt.groupby?.columns) {
      for (const item of stmt.groupby.columns) {
        this.checkNodeForXmlJson(item);
      }
    }

    if (stmt.with) {
      for (const cte of stmt.with) {
        if (cte.stmt?.ast) {
          this.checkForXmlJsonRecursive(cte.stmt.ast);
        }
      }
    }
  }

  private checkNodeForXmlJson(node: any): void {
    if (!node) return;

    if (node.ast) {
      this.checkForXmlJsonRecursive(node.ast);
    }

    if (node.left) this.checkNodeForXmlJson(node.left);
    if (node.right) this.checkNodeForXmlJson(node.right);
    if (node.expr) this.checkNodeForXmlJson(node.expr);

    if (node.result) this.checkNodeForXmlJson(node.result);
    if (node.condition) this.checkNodeForXmlJson(node.condition);

    if (node.args) {
      const args = Array.isArray(node.args) ? node.args : node.args?.value || [];
      for (const arg of Array.isArray(args) ? args : [args]) {
        this.checkNodeForXmlJson(arg);
      }
    }
    if (node.value && Array.isArray(node.value)) {
      for (const val of node.value) {
        this.checkNodeForXmlJson(val);
      }
    }

    if (node.over?.as_window_specification?.window_specification) {
      const winSpec = node.over.as_window_specification.window_specification;
      if (winSpec.orderby) {
        for (const item of winSpec.orderby) {
          this.checkNodeForXmlJson(item.expr);
        }
      }
      if (winSpec.partitionby) {
        for (const item of winSpec.partitionby) {
          this.checkNodeForXmlJson(item);
        }
      }
    }
  }

  private maskDebugBlockedColumns(data: Record<string, unknown>[], tables: string[]): void {
    if (!data?.length || !tables?.length) return;

    const blockedColumns = new Set<string>();
    for (const table of tables) {
      const tableCols = DebugBlockedCols[table];
      if (tableCols) {
        for (const col of tableCols) {
          blockedColumns.add(col.toLowerCase());
        }
      }
    }

    if (blockedColumns.size === 0) return;

    for (const entry of data) {
      for (const key of Object.keys(entry)) {
        if (this.shouldMaskDebugColumn(key, blockedColumns)) {
          entry[key] = entry[key] == null ? '[RESTRICTED:NULL]' : '[RESTRICTED:SET]';
        }
      }
    }
  }

  private shouldMaskDebugColumn(columnName: string, blockedColumns: Set<string>): boolean {
    const lower = columnName.toLowerCase();

    for (const blocked of blockedColumns) {
      if (lower === blocked || lower.endsWith('_' + blocked)) {
        return true;
      }
    }
    return false;
  }

  private ensureResultLimit(sql: string): string {
    const normalized = sql.trim().toLowerCase();

    if (normalized.includes(' top ') || normalized.includes(' limit ')) {
      return sql;
    }

    const hasOrderBy = /order\s+by/i.test(normalized);
    const orderByClause = hasOrderBy ? '' : ' ORDER BY (SELECT NULL)';

    let trimmed = sql.trim();
    while (trimmed.endsWith(';')) trimmed = trimmed.slice(0, -1);

    return `${trimmed}${orderByClause} OFFSET 0 ROWS FETCH NEXT ${DebugMaxResults} ROWS ONLY`;
  }
}
