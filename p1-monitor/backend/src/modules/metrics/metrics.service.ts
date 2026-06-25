import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  @Cron('*/5 * * * * *')
  async generateMetrics() {
    this.logger.debug('Generating mock metrics...');

    const servers = await this.prisma.server.findMany({
      where: { status: 'online' },
    });

    for (const server of servers) {
      const metrics = this.simulateMetrics(server.id);

      await this.prisma.metric.createMany({
        data: metrics,
      });

      this.eventEmitter.emit('metric.created', metrics);
    }

    this.logger.debug(`Generated ${servers.length * 4} metrics.`);
  }

  private simulateMetrics(serverId: string) {
    const isAnomaly = Math.random() < 0.1;

    return [
      {
        serverId,
        metricType: 'cpu',
        value: isAnomaly ? 85 + Math.random() * 15 : 20 + Math.random() * 50,
        unit: '%',
      },
      {
        serverId,
        metricType: 'memory',
        value: 40 + Math.random() * 40,
        unit: '%',
      },
      {
        serverId,
        metricType: 'temperature',
        value: isAnomaly ? 32 + Math.random() * 5 : 22 + Math.random() * 8,
        unit: 'C',
      },
      {
        serverId,
        metricType: 'disk_io',
        value: 10 + Math.random() * 90,
        unit: 'MB/s',
      },
    ];
  }

  async generateOnce() {
    await this.generateMetrics();
  }

  async getRecentMetrics(serverId: string, metricType: string, limit = 20) {
    const metrics = await this.prisma.metric.findMany({
      where: { serverId, metricType },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return metrics.map((metric) => ({
      ...metric,
      id: metric.id.toString(),
    }));
  }
}
