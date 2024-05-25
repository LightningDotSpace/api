import * as AppInsights from 'applicationinsights';
import { TelemetryClient } from 'applicationinsights';
import { SeverityLevel } from 'applicationinsights/out/Declarations/Contracts';
import { Logger } from 'tslog';

export enum LogLevel {
  CRITICAL = 'Critical',
  ERROR = 'Error',
  WARN = 'Warn',
  INFO = 'Info',
  VERBOSE = 'Verbose',
}

export class LnbitsApiLogger {
  private readonly context?: string;
  private readonly logger: Logger<any>;

  constructor(context?: { name: string } | string) {
    this.context = typeof context === 'string' ? context : context?.name;
    this.logger = new Logger({
      name: this.context ?? '',
      type: 'pretty',
      hideLogPositionForProduction: true,
    });
  }

  log(level: LogLevel, message: string, error?: unknown) {
    switch (level) {
      case LogLevel.CRITICAL:
        this.critical(message, error);
        break;

      case LogLevel.ERROR:
        this.error(message, error);
        break;

      case LogLevel.WARN:
        this.warn(message, error);
        break;

      case LogLevel.INFO:
        this.info(message, error);
        break;

      case LogLevel.VERBOSE:
        this.verbose(message, error);
        break;
    }
  }

  critical(message: string, error?: unknown) {
    //this.trace(SeverityLevel.Critical, message, error);
    this.logger.error(this.format(message, error));
  }

  error(message: string, error?: unknown) {
    this.trace(SeverityLevel.Error, message, error);
    this.logger.error(this.format(message, error));
  }

  warn(message: string, error?: unknown) {
    //this.trace(SeverityLevel.Warning, message, error);
    this.logger.warn(this.format(message, error));
  }

  info(message: string, error?: unknown) {
    //this.trace(SeverityLevel.Information, message, error);
    this.logger.info(this.format(message, error));
  }

  verbose(message: string, error?: unknown) {
    //this.trace(SeverityLevel.Verbose, message, error);
    this.logger.trace(this.format(message, error));
  }

  // --- HELPER METHODS --- //

  private trace(severity: SeverityLevel, message: string, error?: unknown) {
    const trace = (this.context ? `[${this.context}] ` : '') + this.format(message, error);
    this.client?.trackTrace({ severity, message: trace });
  }

  private format(message: string, error?: unknown): string {
    if (error instanceof Error) return message + (error ? ` ${error?.stack}` : '');
    return message;
  }

  private get client(): TelemetryClient | undefined {
    return AppInsights.defaultClient;
  }
}
