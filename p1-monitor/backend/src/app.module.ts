import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HealthModule } from './modules/health/health.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { EventLoggerService } from './modules/event-logger/event-logger.service';
import { EventLoggerModule } from './modules/event-logger/event-logger.module';
@Module({
  imports: [PrismaModule,ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    ScheduleModule.forRoot(), //启用定时任务
    EventEmitterModule.forRoot(), MetricsModule, EventLoggerModule // 启动事件
  ],
  controllers: [AppController],
  providers: [AppService, EventLoggerService],
})
export class AppModule {}
