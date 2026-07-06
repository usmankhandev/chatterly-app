import { Request, Response, NextFunction } from 'express';
import {
  httpRequestDuration,
  httpRequestsCounter,
  httpActiveConnections,
} from './http-metrics';
import { hrtime } from 'process';

export function httpMetricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.path === '/metrics') return next();

  const start = process.hrtime.bigint();
  httpActiveConnections.inc();

  res.on('finish', () => {
    const seconds = Number(process.hrtime.bigint() - start) / 1e9;
    const route = (req.route?.path as string) ?? req.path;
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
    };
    httpRequestDuration.observe(labels, seconds);
    httpRequestsCounter.inc(labels);
    httpActiveConnections.dec();
  });

  next();
}
