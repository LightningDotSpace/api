// Boltz PostgreSQL debug endpoint configuration

// Maximum number of results returned by Boltz debug queries
export const BoltzMaxResults = 10000;

// Blocked database schemas (PostgreSQL system tables)
export const BoltzBlockedSchemas = ['pg_catalog', 'information_schema', 'pg_toast'];

// Dangerous SQL functions that could be used for data exfiltration or external connections
export const BoltzDangerousFunctions = ['pg_read_file', 'pg_read_binary_file', 'pg_ls_dir', 'lo_import', 'lo_export'];

// Blocked columns per table (sensitive data that should not be exposed via debug endpoint)
// Table names are lowercase (PostgreSQL default)
export const BoltzBlockedCols: Record<string, string[]> = {
  referrals: ['apiKey', 'apiSecret'],
  keyproviders: ['privateKey'],
  swaps: ['preimage'],
  reverseswaps: ['preimage'],
  chainswaps: ['preimage'],
};
