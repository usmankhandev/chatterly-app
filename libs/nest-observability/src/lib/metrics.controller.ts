import { Controller, Get, Header } from '@nestjs/common';
import { register } from '@chatterly/observability';

@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', register.contentType)
  async metrics(): Promise<string> {
    return register.metrics();
  }
}
