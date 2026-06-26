import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HealthModule } from './modules/health/health.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { EventLoggerModule } from './modules/event-logger/event-logger.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(), // 启用定时任务
    EventEmitterModule.forRoot(), // 启用事件
    PrismaModule,
    HealthModule,
    MetricsModule,
    EventLoggerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
