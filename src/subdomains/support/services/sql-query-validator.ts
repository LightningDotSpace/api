import { BadRequestException } from '@nestjs/common';
import { Parser } from 'node-sql-parser';

export enum SqlDialect {
  MSSQL = 'TransactSQL',
  PostgreSQL = 'PostgreSQL',
}

// Configuration for SQL query validation
export interface SqlQueryConfig {
  // SQL dialect for parsing
  database: SqlDialect;
  // Schemas/databases that are blocked from access
  blockedSchemas: string[];
  // Columns blocked per table (table names should be lowercase for lookup)
  blockedCols: Record<string, string[]>;
  // Dangerous functions that should be rejected
  dangerousFunctions: string[];
  // Maximum number of results to return
  maxResults: number;
  // Whether to check for FOR XML/JSON (MSSQL-specific)
  checkForXmlJson?: boolean;
  // Whether to check for linked servers (MSSQL-specific)
  checkLinkedServers?: boolean;
}

export interface SqlValidationResult {
  ast: any;
  tables: string[];
}

export class SqlQueryValidator {
  private readonly sqlParser = new Parser();

  /**
   * Validates a SQL query against the provided configuration.
   * Throws BadRequestException if validation fails.
   * Returns the parsed AST and extracted table names on success.
   */
  validateQuery(sql: string, config: SqlQueryConfig): SqlValidationResult {
    // 1. Parse SQL to AST for robust validation
    let ast;
    try {
      ast = this.sqlParser.astify(sql, { database: config.database });
    } catch {
      throw new BadRequestException('Invalid SQL syntax');
    }

    // 2. Only single SELECT statements allowed
    const statements = Array.isArray(ast) ? ast : [ast];
    if (statements.length !== 1) {
      throw new BadRequestException('Only single statements allowed');
    }

    const stmt = statements[0];
    if (stmt.type !== 'select') {
      throw new BadRequestException('Only SELECT queries allowed');
    }

    // 3. No UNION/INTERSECT/EXCEPT queries
    if (stmt._next) {
      throw new BadRequestException('UNION/INTERSECT/EXCEPT queries not allowed');
    }

    // 4. No SELECT INTO
    if (stmt.into?.type === 'into' || stmt.into?.expr) {
      throw new BadRequestException('SELECT INTO not allowed');
    }

    // 5. No system tables/schemas
    this.checkForBlockedSchemas(stmt, config);

    // 6. No dangerous functions
    this.checkForDangerousFunctionsRecursive(stmt, config);

    // 7. No FOR XML/JSON (MSSQL-specific)
    if (config.checkForXmlJson) {
      this.checkForXmlJsonRecursive(stmt);
    }

    // 8. Check for blocked columns BEFORE execution
    const tables = this.getTablesFromQuery(sql, config.database);
    const blockedColumn = this.findBlockedColumnInQuery(sql, stmt, tables, config);
    if (blockedColumn) {
      throw new BadRequestException(`Access to column '${blockedColumn}' is not allowed`);
    }

    // 9. Validate result limit if present
    const limitValue = config.database === SqlDialect.PostgreSQL ? stmt.limit?.value?.[0]?.value : stmt.top?.value;
    if (limitValue > config.maxResults) {
      throw new BadRequestException(
        `${config.database === SqlDialect.PostgreSQL ? 'LIMIT' : 'TOP'} value exceeds maximum of ${config.maxResults}`,
      );
    }

    return { ast: stmt, tables };
  }

  /**
   * Ensures SQL has a result limit. Returns modified SQL.
   */
  ensureResultLimit(sql: string, config: SqlQueryConfig): string {
    const normalized = sql.trim().toLowerCase();

    if (config.database === SqlDialect.PostgreSQL) {
      if (normalized.includes(' limit ')) {
        return sql;
      }
      let trimmed = sql.trim();
      while (trimmed.endsWith(';')) trimmed = trimmed.slice(0, -1);
      return `${trimmed} LIMIT ${config.maxResults}`;
    } else {
      // TransactSQL (MSSQL)
      if (normalized.includes(' top ') || normalized.includes(' limit ')) {
        return sql;
      }
      const hasOrderBy = /order\s+by/i.test(normalized);
      const orderByClause = hasOrderBy ? '' : ' ORDER BY (SELECT NULL)';
      let trimmed = sql.trim();
      while (trimmed.endsWith(';')) trimmed = trimmed.slice(0, -1);
      return `${trimmed}${orderByClause} OFFSET 0 ROWS FETCH NEXT ${config.maxResults} ROWS ONLY`;
    }
  }

  /**
   * Masks blocked columns in result data (defense in depth).
   */
  maskBlockedColumns(data: Record<string, unknown>[], tables: string[], config: SqlQueryConfig): void {
    if (!data?.length || !tables?.length) return;

    const blockedColumns = new Set<string>();
    for (const table of tables) {
      const tableCols = config.blockedCols[table.toLowerCase()];
      if (tableCols) {
        for (const col of tableCols) {
          blockedColumns.add(col.toLowerCase());
        }
      }
    }

    if (blockedColumns.size === 0) return;

    for (const entry of data) {
      for (const key of Object.keys(entry)) {
        if (this.shouldMaskColumn(key, blockedColumns)) {
          entry[key] = entry[key] == null ? '[RESTRICTED:NULL]' : '[RESTRICTED:SET]';
        }
      }
    }
  }

  // --- Private Helper Methods --- //

  private getTablesFromQuery(sql: string, database: SqlDialect): string[] {
    const tableList = this.sqlParser.tableList(sql, { database });
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

  private isColumnBlockedInTable(
    columnName: string,
    table: string | null,
    allTables: string[],
    config: SqlQueryConfig,
  ): boolean {
    const lower = columnName.toLowerCase();

    if (table) {
      const blockedCols = config.blockedCols[table.toLowerCase()];
      return blockedCols?.some((b) => b.toLowerCase() === lower) ?? false;
    } else {
      return allTables.some((t) => {
        const blockedCols = config.blockedCols[t.toLowerCase()];
        return blockedCols?.some((b) => b.toLowerCase() === lower) ?? false;
      });
    }
  }

  private findBlockedColumnInQuery(
    sql: string,
    ast: any,
    tables: string[],
    config: SqlQueryConfig,
  ): string | null {
    try {
      const columns = this.sqlParser.columnList(sql, { database: config.database });
      const aliasMap = this.getAliasToTableMap(ast);

      for (const col of columns) {
        const parts = col.split('::');
        const tableOrAlias = parts[1];
        const columnName = parts[2];

        if (columnName === '*' || columnName === '(.*)') continue;

        const resolvedTable = this.resolveTableFromAlias(tableOrAlias, tables, aliasMap);

        if (this.isColumnBlockedInTable(columnName, resolvedTable, tables, config)) {
          return `${resolvedTable || 'unknown'}.${columnName}`;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private checkForBlockedSchemas(stmt: any, config: SqlQueryConfig): void {
    if (!stmt) return;

    if (stmt.from) {
      for (const item of stmt.from) {
        // Check for linked servers (MSSQL-specific)
        if (config.checkLinkedServers && item.server) {
          throw new BadRequestException('Linked server access is not allowed');
        }

        const schema = item.db?.toLowerCase() || item.schema?.toLowerCase();
        const table = item.table?.toLowerCase();

        if (schema && config.blockedSchemas.includes(schema)) {
          throw new BadRequestException(`Access to schema '${schema}' is not allowed`);
        }

        if (table && config.blockedSchemas.some((s) => table.startsWith(s + '.'))) {
          throw new BadRequestException(`Access to system tables is not allowed`);
        }

        if (item.expr?.ast) {
          this.checkForBlockedSchemas(item.expr.ast, config);
        }

        this.checkSubqueriesForBlockedSchemas(item.on, config);
      }
    }

    if (stmt.columns) {
      for (const col of stmt.columns) {
        this.checkSubqueriesForBlockedSchemas(col.expr, config);
      }
    }

    this.checkSubqueriesForBlockedSchemas(stmt.where, config);
    this.checkSubqueriesForBlockedSchemas(stmt.having, config);

    if (stmt.orderby) {
      for (const item of stmt.orderby) {
        this.checkSubqueriesForBlockedSchemas(item.expr, config);
      }
    }

    if (stmt.groupby?.columns) {
      for (const item of stmt.groupby.columns) {
        this.checkSubqueriesForBlockedSchemas(item, config);
      }
    }

    if (stmt.with) {
      for (const cte of stmt.with) {
        if (cte.stmt?.ast) {
          this.checkForBlockedSchemas(cte.stmt.ast, config);
        }
      }
    }
  }

  private checkSubqueriesForBlockedSchemas(node: any, config: SqlQueryConfig): void {
    if (!node) return;

    if (node.ast) {
      this.checkForBlockedSchemas(node.ast, config);
    }

    if (node.left) this.checkSubqueriesForBlockedSchemas(node.left, config);
    if (node.right) this.checkSubqueriesForBlockedSchemas(node.right, config);
    if (node.expr) this.checkSubqueriesForBlockedSchemas(node.expr, config);

    if (node.result) this.checkSubqueriesForBlockedSchemas(node.result, config);
    if (node.condition) this.checkSubqueriesForBlockedSchemas(node.condition, config);

    if (node.args) {
      const args = Array.isArray(node.args) ? node.args : node.args?.value || [];
      for (const arg of Array.isArray(args) ? args : [args]) {
        this.checkSubqueriesForBlockedSchemas(arg, config);
      }
    }
    if (node.value && Array.isArray(node.value)) {
      for (const val of node.value) {
        this.checkSubqueriesForBlockedSchemas(val, config);
      }
    }

    if (node.over?.as_window_specification?.window_specification) {
      const winSpec = node.over.as_window_specification.window_specification;
      if (winSpec.orderby) {
        for (const item of winSpec.orderby) {
          this.checkSubqueriesForBlockedSchemas(item.expr, config);
        }
      }
      if (winSpec.partitionby) {
        for (const item of winSpec.partitionby) {
          this.checkSubqueriesForBlockedSchemas(item, config);
        }
      }
    }
  }

  private checkForDangerousFunctionsRecursive(stmt: any, config: SqlQueryConfig): void {
    if (!stmt) return;

    this.checkFromForDangerousFunctions(stmt.from, config);
    this.checkExpressionsForDangerousFunctions(stmt.columns, config);
    this.checkNodeForDangerousFunctions(stmt.where, config);
    this.checkNodeForDangerousFunctions(stmt.having, config);

    if (stmt.orderby) {
      for (const item of stmt.orderby) {
        this.checkNodeForDangerousFunctions(item.expr, config);
      }
    }

    if (stmt.groupby?.columns) {
      for (const item of stmt.groupby.columns) {
        this.checkNodeForDangerousFunctions(item, config);
      }
    }

    if (stmt.with) {
      for (const cte of stmt.with) {
        if (cte.stmt?.ast) {
          this.checkForDangerousFunctionsRecursive(cte.stmt.ast, config);
        }
      }
    }
  }

  private checkFromForDangerousFunctions(from: any[], config: SqlQueryConfig): void {
    if (!from) return;

    for (const item of from) {
      if (item.type === 'expr' && item.expr?.type === 'function') {
        const funcName = this.extractFunctionName(item.expr);
        if (funcName && config.dangerousFunctions.includes(funcName)) {
          throw new BadRequestException(`Function '${funcName.toUpperCase()}' not allowed`);
        }
      }

      if (item.expr?.ast) {
        this.checkForDangerousFunctionsRecursive(item.expr.ast, config);
      }

      this.checkNodeForDangerousFunctions(item.on, config);
    }
  }

  private checkExpressionsForDangerousFunctions(columns: any[], config: SqlQueryConfig): void {
    if (!columns) return;

    for (const col of columns) {
      this.checkNodeForDangerousFunctions(col.expr, config);
    }
  }

  private checkNodeForDangerousFunctions(node: any, config: SqlQueryConfig): void {
    if (!node) return;

    if (node.type === 'function') {
      const funcName = this.extractFunctionName(node);
      if (funcName && config.dangerousFunctions.includes(funcName)) {
        throw new BadRequestException(`Function '${funcName.toUpperCase()}' not allowed`);
      }
    }

    if (node.ast) {
      this.checkForDangerousFunctionsRecursive(node.ast, config);
    }

    if (node.left) this.checkNodeForDangerousFunctions(node.left, config);
    if (node.right) this.checkNodeForDangerousFunctions(node.right, config);
    if (node.expr) this.checkNodeForDangerousFunctions(node.expr, config);

    if (node.result) this.checkNodeForDangerousFunctions(node.result, config);
    if (node.condition) this.checkNodeForDangerousFunctions(node.condition, config);

    if (node.args) {
      const args = Array.isArray(node.args) ? node.args : node.args?.value || [];
      for (const arg of Array.isArray(args) ? args : [args]) {
        this.checkNodeForDangerousFunctions(arg, config);
      }
    }
    if (node.value && Array.isArray(node.value)) {
      for (const val of node.value) {
        this.checkNodeForDangerousFunctions(val, config);
      }
    }

    if (node.over?.as_window_specification?.window_specification) {
      const winSpec = node.over.as_window_specification.window_specification;
      if (winSpec.orderby) {
        for (const item of winSpec.orderby) {
          this.checkNodeForDangerousFunctions(item.expr, config);
        }
      }
      if (winSpec.partitionby) {
        for (const item of winSpec.partitionby) {
          this.checkNodeForDangerousFunctions(item, config);
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

  private shouldMaskColumn(columnName: string, blockedColumns: Set<string>): boolean {
    const lower = columnName.toLowerCase();

    for (const blocked of blockedColumns) {
      if (lower === blocked || lower.endsWith('_' + blocked)) {
        return true;
      }
    }
    return false;
  }
}
