import { SqlDialect, SqlQueryConfig } from '../services/sql-query-validator';

// Boltz PostgreSQL debug endpoint configuration

// Maximum number of results returned by Boltz debug queries
const BoltzMaxResults = 10000;

// Blocked database schemas (PostgreSQL system tables)
const BoltzBlockedSchemas = ['pg_catalog', 'information_schema', 'pg_toast'];

// Dangerous SQL functions that could be used for data exfiltration, external connections, or DoS
const BoltzDangerousFunctions = [
  'pg_read_file',
  'pg_read_binary_file',
  'pg_ls_dir',
  'lo_import',
  'lo_export',
  'dblink',
  'dblink_exec',
  'dblink_connect',
  'pg_sleep',
];

// Blocked columns per table (sensitive data that should not be exposed via debug endpoint)
// Table names MUST be lowercase (lookup uses case-insensitive matching via toLowerCase())
const BoltzBlockedCols: Record<string, string[]> = {
  referrals: ['apiKey', 'apiSecret'],
  swaps: ['preimage'],
  reverseswaps: ['preimage', 'minerFeeInvoicePreimage'],
  chainswaps: ['preimage'],
};

// Boltz PostgreSQL debug query configuration
export const BoltzDebugConfig: SqlQueryConfig = {
  database: SqlDialect.PostgreSQL,
  blockedSchemas: BoltzBlockedSchemas,
  blockedCols: BoltzBlockedCols,
  dangerousFunctions: BoltzDangerousFunctions,
  maxResults: BoltzMaxResults,
};
