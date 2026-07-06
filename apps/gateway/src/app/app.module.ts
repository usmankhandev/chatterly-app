import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MetricsModule } from '@chatterly/nest-observability';

@Module({
  imports: [MetricsModule.forRoot('gateway')],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
