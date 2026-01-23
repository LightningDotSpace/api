import { LogQueryDto, LogQueryTemplate } from './log-query.dto';

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
  transaction_lightning: ['secret', 'paymentRequest'],
  payment_request: ['paymentRequest'],
};

// Log query templates for Azure Application Insights
export const DebugLogQueryTemplates: Record<
  LogQueryTemplate,
  { kql: string; requiredParams: (keyof LogQueryDto)[]; defaultLimit: number }
> = {
  [LogQueryTemplate.TRACES_BY_OPERATION]: {
    kql: `traces
| where operation_Id == "{operationId}"
| where timestamp > ago({hours}h)
| project timestamp, severityLevel, message, customDimensions
| order by timestamp desc`,
    requiredParams: ['operationId'],
    defaultLimit: 500,
  },
  [LogQueryTemplate.TRACES_BY_MESSAGE]: {
    kql: `traces
| where timestamp > ago({hours}h)
| where message contains "{messageFilter}"
| project timestamp, severityLevel, message, operation_Id
| order by timestamp desc`,
    requiredParams: ['messageFilter'],
    defaultLimit: 200,
  },
  [LogQueryTemplate.EXCEPTIONS_RECENT]: {
    kql: `exceptions
| where timestamp > ago({hours}h)
| project timestamp, problemId, outerMessage, innermostMessage, operation_Id
| order by timestamp desc`,
    requiredParams: [],
    defaultLimit: 500,
  },
  [LogQueryTemplate.REQUEST_FAILURES]: {
    kql: `requests
| where timestamp > ago({hours}h)
| where success == false
| project timestamp, resultCode, duration, operation_Name, operation_Id
| order by timestamp desc`,
    requiredParams: [],
    defaultLimit: 500,
  },
  [LogQueryTemplate.DEPENDENCIES_SLOW]: {
    kql: `dependencies
| where timestamp > ago({hours}h)
| where duration > {durationMs}
| project timestamp, target, type, duration, success, operation_Id
| order by duration desc`,
    requiredParams: ['durationMs'],
    defaultLimit: 200,
  },
  [LogQueryTemplate.CUSTOM_EVENTS]: {
    kql: `customEvents
| where timestamp > ago({hours}h)
| where name == "{eventName}"
| project timestamp, name, customDimensions, operation_Id
| order by timestamp desc`,
    requiredParams: ['eventName'],
    defaultLimit: 500,
  },
};
