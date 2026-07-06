import { Counter, Histogram, Gauge } from 'prom-client';
import { register } from './registry';

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpRequestsCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total Http Requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpActiveConnections = new Gauge({
  name: 'http_active_connections',
  help: 'In-flight HTTP Conenctions',
  registers: [register],
});
