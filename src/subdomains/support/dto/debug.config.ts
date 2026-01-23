// Debug endpoint configuration

// Maximum number of results returned by debug queries
export const DebugMaxResults = 10000;

// Blocked database schemas (system tables)
export const DebugBlockedSchemas = ['sys', 'information_schema', 'master', 'msdb', 'tempdb'];

// Dangerous SQL functions that could be used for data exfiltration or external connections
export const DebugDangerousFunctions = ['openrowset', 'openquery', 'opendatasource', 'openxml'];

// Blocked columns per table (sensitive data that should not be exposed via debug endpoint)
export const DebugBlockedCols: Record<string, string[]> = {
  wallet: ['signature', 'addressOwnershipProof'],
  lightning_wallet: ['adminKey', 'invoiceKey'],
  user_boltcard: ['k0', 'k1', 'k2', 'prevK0', 'prevK1', 'prevK2', 'otp', 'uid'],
  wallet_provider: ['apiKey', 'apiSecret'],
};
