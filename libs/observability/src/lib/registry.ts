import { Registry, collectDefaultMetrics } from 'prom-client';

export const register = new Registry();
collectDefaultMetrics({ register });

export function setServiceName(service: string) {
  register.setDefaultLabels({ service });
}
