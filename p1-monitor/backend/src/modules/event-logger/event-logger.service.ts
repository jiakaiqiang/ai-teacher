import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class EventLoggerService {
    private readonly logger = new Logger(EventLoggerService.name);

    @OnEvent('metric.created')
    handleMetricCreated(metrics: any[]) {
        const cpuMetrics = metrics.filter((m) => m.metricType === 'cpu');
        const highCpu = cpuMetrics.filter((m) => m.value > 80);

        if (highCpu.length > 0) {
            this.logger.warn(
                `🔴 检测到 ${highCpu.length} 个高 CPU：` +
                highCpu.map((m) => `${m.serverId}=${m.value.toFixed(1)}%`).join(', '),
            );
        }
    }

    @OnEvent('anomaly.detected')
    handleAnomalyDetected(anomaly: any) {
        this.logger.error(`🚨 异常检测: ${anomaly.serverId} - ${anomaly.type}`);
    }
}
