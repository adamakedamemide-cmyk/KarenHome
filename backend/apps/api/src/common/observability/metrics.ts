/**
 * Gate 4 §19 — in-process metrics registry with Prometheus text exposition.
 * Counters, gauges and histograms for: HTTP duration, DB timing, search
 * timing, queue timing, job retries, outbox/index lag. Single-node registry.
 */
type Labels = Record<string, string>;

interface HistogramState {
  bucketCounts: number[];
  sum: number;
  count: number;
}

interface HistogramEntry {
  help: string;
  buckets: number[];
  series: Map<string, HistogramState>;
}

export class MetricsRegistry {
  private readonly counters = new Map<string, { help: string; values: Map<string, number> }>();
  private readonly gauges = new Map<string, { help: string; values: Map<string, number> }>();
  private readonly histograms = new Map<string, HistogramEntry>();

  private static key(labels: Labels): string {
    const parts = Object.keys(labels).sort().map((k) => `${k}="${String(labels[k] ?? '').replace(/"/g, '')}"`);
    return parts.length ? parts.join(',') : '';
  }

  counter(name: string, help: string, labels: Labels = {}, value = 1): void {
    let entry = this.counters.get(name);
    if (!entry) { entry = { help, values: new Map() }; this.counters.set(name, entry); }
    const key = MetricsRegistry.key(labels);
    entry.values.set(key, (entry.values.get(key) ?? 0) + value);
  }

  gauge(name: string, help: string, labels: Labels = {}, value: number): void {
    let entry = this.gauges.get(name);
    if (!entry) { entry = { help, values: new Map() }; this.gauges.set(name, entry); }
    entry.values.set(MetricsRegistry.key(labels), value);
  }

  private static defaultBuckets(): number[] {
    return [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
  }

  histogram(name: string, help: string, labels: Labels, valueMs: number, buckets?: number[]): void {
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
      const bound: number | undefined = entry.buckets[i];
      if (bound !== undefined && valueMs <= bound) state.bucketCounts[i] = (state.bucketCounts[i] ?? 0) + 1;
    }
    state.sum += valueMs;
    state.count += 1;
  }

  async observe<T>(name: string, help: string, labels: Labels, fn: () => Promise<T>, buckets?: number[]): Promise<T> {
    const started = process.hrtime.bigint();
    try {
      return await fn();
    } finally {
      const ms = Number(process.hrtime.bigint() - started) / 1_000_000;
      this.histogram(name, help, labels, ms, buckets);
    }
  }

  renderPrometheus(): string {
    const lines: string[] = [];
    for (const [name, entry] of this.counters) {
      lines.push(`# HELP ${name} ${entry.help}`, `# TYPE ${name} counter`);
      for (const [key, value] of entry.values) lines.push(`${name}${key ? `{${key}}` : ''} ${value}`);
    }
    for (const [name, entry] of this.gauges) {
      lines.push(`# HELP ${name} ${entry.help}`, `# TYPE ${name} gauge`);
      for (const [key, value] of entry.values) lines.push(`${name}${key ? `{${key}}` : ''} ${value}`);
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
