import { ConfigService } from '@nestjs/config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Gate 4 §19 — structured JSON logging (request id / trace id / context).
 * Zero-dependency console transport; fields are machine-parseable so any
 * log shipper can pick them up. Never log secrets or full payloads.
 */
export class StructuredLogger {
  private readonly minLevel: LogLevel;

  constructor(private readonly baseContext: Record<string, unknown> = {}, minLevel?: LogLevel) {
    this.minLevel = minLevel ?? 'info';
  }

  static create(service: string, env: Record<string, unknown> = {}, context: Record<string, unknown> = {}): StructuredLogger {
    const raw = String(env.LOG_LEVEL ?? 'info') as LogLevel;
    const level: LogLevel = raw in LEVEL_WEIGHT ? raw : 'info';
    return new StructuredLogger({ service, ...context }, level);
  }

  child(context: Record<string, unknown>): StructuredLogger {
    return new StructuredLogger({ ...this.baseContext, ...context }, this.minLevel);
  }

  debug(message: string, fields?: Record<string, unknown>): void { this.write('debug', message, fields); }
  info(message: string, fields?: Record<string, unknown>): void { this.write('info', message, fields); }
  warn(message: string, fields?: Record<string, unknown>): void { this.write('warn', message, fields); }
  error(message: string, fields?: Record<string, unknown>): void { this.write('error', message, fields); }

  private write(level: LogLevel, message: string, fields?: Record<string, unknown>): void {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[this.minLevel]) return;
    const entry = { ts: new Date().toISOString(), level, message, ...this.baseContext, ...(fields ?? {}) };
    const line = JSON.stringify(entry);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  }
}

export function loggerFromEnv(service: string): StructuredLogger {
  return StructuredLogger.create(service, process.env as Record<string, unknown>);
}

/** ConfigService-friendly helper (used by API providers). */
export function loggerForConfig(service: string, config: ConfigService): StructuredLogger {
  return StructuredLogger.create(service, {
    LOG_LEVEL: config.get<string>('LOG_LEVEL', 'info'),
  });
}
