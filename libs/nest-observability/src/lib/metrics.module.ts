import {
  DynamicModule,
  MiddlewareConsumer,
  NestModule,
  Module,
} from '@nestjs/common';

import {
  httpMetricsMiddleware,
  setServiceName,
} from '@chatterly/observability';
import { MetricsController } from './metrics.controller';

@Module({})
export class MetricsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(httpMetricsMiddleware).forRoutes('*');
  }
  static forRoot(serviceName: string): DynamicModule {
    setServiceName(serviceName);
    return {
      module: MetricsModule,
      controllers: [MetricsController],
      global: true,
    };
  }
}
