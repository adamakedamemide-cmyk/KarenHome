"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructuredLogger = void 0;
exports.loggerFromEnv = loggerFromEnv;
exports.loggerForConfig = loggerForConfig;
const LEVEL_WEIGHT = { debug: 10, info: 20, warn: 30, error: 40 };
/**
 * Gate 4 §19 — structured JSON logging (request id / trace id / context).
 * Zero-dependency console transport; fields are machine-parseable so any
 * log shipper can pick them up. Never log secrets or full payloads.
 */
class StructuredLogger {
    baseContext;
    minLevel;
    constructor(baseContext = {}, minLevel) {
        this.baseContext = baseContext;
        this.minLevel = minLevel ?? 'info';
    }
    static create(service, env = {}, context = {}) {
        const raw = String(env.LOG_LEVEL ?? 'info');
        const level = raw in LEVEL_WEIGHT ? raw : 'info';
        return new StructuredLogger({ service, ...context }, level);
    }
    child(context) {
        return new StructuredLogger({ ...this.baseContext, ...context }, this.minLevel);
    }
    debug(message, fields) { this.write('debug', message, fields); }
    info(message, fields) { this.write('info', message, fields); }
    warn(message, fields) { this.write('warn', message, fields); }
    error(message, fields) { this.write('error', message, fields); }
    write(level, message, fields) {
        if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[this.minLevel])
            return;
        const entry = { ts: new Date().toISOString(), level, message, ...this.baseContext, ...(fields ?? {}) };
        const line = JSON.stringify(entry);
        if (level === 'error')
            console.error(line);
        else if (level === 'warn')
            console.warn(line);
        else
            console.log(line);
    }
}
exports.StructuredLogger = StructuredLogger;
function loggerFromEnv(service) {
    return StructuredLogger.create(service, process.env);
}
/** ConfigService-friendly helper (used by API providers). */
function loggerForConfig(service, config) {
    return StructuredLogger.create(service, {
        LOG_LEVEL: config.get('LOG_LEVEL', 'info'),
    });
}
