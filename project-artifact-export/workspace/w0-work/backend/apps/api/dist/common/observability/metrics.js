"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsRegistry = void 0;
class MetricsRegistry {
    counters = new Map();
    gauges = new Map();
    histograms = new Map();
    static key(labels) {
        const parts = Object.keys(labels).sort().map((k) => `${k}="${String(labels[k] ?? '').replace(/"/g, '')}"`);
        return parts.length ? parts.join(',') : '';
    }
    counter(name, help, labels = {}, value = 1) {
        let entry = this.counters.get(name);
        if (!entry) {
            entry = { help, values: new Map() };
            this.counters.set(name, entry);
        }
        const key = MetricsRegistry.key(labels);
        entry.values.set(key, (entry.values.get(key) ?? 0) + value);
    }
    gauge(name, help, labels = {}, value) {
        let entry = this.gauges.get(name);
        if (!entry) {
            entry = { help, values: new Map() };
            this.gauges.set(name, entry);
        }
        entry.values.set(MetricsRegistry.key(labels), value);
    }
    static defaultBuckets() {
        return [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
    }
    histogram(name, help, labels, valueMs, buckets) {
        let entry = this.histograms.get(name);
        if (!entry) {
            entry = { help, buckets: buckets ?? MetricsRegistry.defaultBuckets(), series: new Map() };
            this.histograms.set(name, entry);
        }
        const key = MetricsRegistry.key(labels);
        let state = entry.series.get(key);
        if (!state) {
            state = { bucketCounts: entry.buckets.map(() => 0), sum: 0, count: 0 };
            entry.series.set(key, state);
        }
        for (let i = 0; i < entry.buckets.length; i += 1) {
            const bound = entry.buckets[i];
            if (bound !== undefined && valueMs <= bound)
                state.bucketCounts[i] = (state.bucketCounts[i] ?? 0) + 1;
        }
        state.sum += valueMs;
        state.count += 1;
    }
    async observe(name, help, labels, fn, buckets) {
        const started = process.hrtime.bigint();
        try {
            return await fn();
        }
        finally {
            const ms = Number(process.hrtime.bigint() - started) / 1_000_000;
            this.histogram(name, help, labels, ms, buckets);
        }
    }
    renderPrometheus() {
        const lines = [];
        for (const [name, entry] of this.counters) {
            lines.push(`# HELP ${name} ${entry.help}`, `# TYPE ${name} counter`);
            for (const [key, value] of entry.values)
                lines.push(`${name}${key ? `{${key}}` : ''} ${value}`);
        }
        for (const [name, entry] of this.gauges) {
            lines.push(`# HELP ${name} ${entry.help}`, `# TYPE ${name} gauge`);
            for (const [key, value] of entry.values)
                lines.push(`${name}${key ? `{${key}}` : ''} ${value}`);
        }
        for (const [name, entry] of this.histograms) {
            lines.push(`# HELP ${name} ${entry.help}`, `# TYPE ${name} histogram`);
            for (const [key, state] of entry.series) {
                const labelPrefix = key ? `{${key},` : '{';
                entry.buckets.forEach((bucket, index) => lines.push(`${name}_bucket${labelPrefix}le="${bucket}"} ${state.bucketCounts[index]}`));
                const suffix = key ? `,${key}}` : '}';
                lines.push(`${name}_bucket${labelPrefix}le="+Inf"} ${state.count}`);
                lines.push(`${name}_sum${suffix} ${state.sum}`);
                lines.push(`${name}_count${suffix} ${state.count}`);
            }
        }
        return `${lines.join('\n')}\n`;
    }
}
exports.MetricsRegistry = MetricsRegistry;
