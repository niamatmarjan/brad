export class MetricsTracker {
  constructor() {
    this.latencies = [];
    this.totalRequests = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
  }

  recordRequest(durationMs, isError = false) {
    this.totalRequests += 1;
    if (isError) this.errorCount += 1;
    this.latencies.push(durationMs);
    if (this.latencies.length > 1000) {
      this.latencies.shift();
    }
  }

  getMetrics() {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const p50 = sorted.length ? sorted[Math.floor(sorted.length * 0.5)] : 0;
    const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;
    const p99 = sorted.length ? sorted[Math.floor(sorted.length * 0.99)] : 0;

    return {
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      totalRequests: this.totalRequests,
      errorCount: this.errorCount,
      latency: {
        p50Ms: Math.round(p50 * 100) / 100,
        p95Ms: Math.round(p95 * 100) / 100,
        p99Ms: Math.round(p99 * 100) / 100,
        sampleCount: sorted.length
      }
    };
  }
}

export function registerHealthRoutes(router, { driver, metricsTracker }) {
  router.get('/health', async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'aegisflow-enterprise-api',
      version: '1.0.0'
    }));
  });

  router.get('/ready', async (req, res) => {
    try {
      // Probe storage readiness
      await driver.query('change_requests', () => false);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'READY',
        storage: 'CONNECTED',
        timestamp: new Date().toISOString()
      }));
    } catch (err) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'NOT_READY',
        error: err.message
      }));
    }
  });

  router.get('/metrics', async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(metricsTracker.getMetrics()));
  });
}
