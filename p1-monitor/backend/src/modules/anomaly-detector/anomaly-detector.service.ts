import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { PrismaService } from 'src/prisma/prisma.service';

interface Metric {

    serverId: string;
    metricType: string;
    value: number;
    timestamp?: Date;
}
@Injectable()
export class AnomalyDetectorService {
    //创建一个log 对象打印日志
    private readonly logger = new Logger(AnomalyDetectorService.name)
    //将这两个服务注册到当前的对应的对象中

    constructor(
        private prisma: PrismaService,
        private eventEmitter: EventEmitter2 
    ) {}

    // 监听事件
    @OnEvent('metric.created')
    //当metric.created事件被触发时，调用detectAnomaly方法
    async detectAnomaly(metrics: Metric[]) {
      for(const metric of metrics) { 
        // metric是一个对象，包含了服务器ID、指标类型、指标值和时间戳等信息 

        // 并行执行 3 种检测算法
      await Promise.all([
        this.detectStaticThreshold(metric),
        this.detectConsecutiveSpike(metric),
        this.detectSuddenChange(metric),
      ]);
      }
        
    
    }


    /**
   * 算法 1：静态阈值检测
   */
  private async detectStaticThreshold(metric: Metric) {
    let anomaly: { type: string; severity: string } | null = null;

    // CPU 阈值
    if (metric.metricType === 'cpu' && metric.value > 85) {
      anomaly = {
        type: 'cpu_spike',
        severity: metric.value > 95 ? 'critical' : 'high',
      };
    }

    // 温度阈值
    if (metric.metricType === 'temperature' && metric.value > 32) {
      anomaly = {
        type: 'temperature_high',
        severity: metric.value > 35 ? 'critical' : 'high',
      };
    }

    // 内存阈值
    if (metric.metricType === 'memory' && metric.value > 90) {
      anomaly = {
        type: 'memory_high',
        severity: 'medium',
      };
    }

    if (anomaly) {
      await this.createAnomaly(metric, anomaly.type, anomaly.severity);
    }
  } /**
   * 算法 2：连续突增检测
   * 连续 5 个点都在上升，且最后一个点 > 80
   */
  private async detectConsecutiveSpike(metric: Metric) {
    if (metric.metricType !== 'cpu') return;

    // 查询最近 5 个点
    const recent = await this.getRecentMetrics(metric.serverId, metric.metricType, 5);
    
    if (recent.length < 5) return;

    // 判断是否连续上升
    let isConsecutiveRising = true;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].value <= recent[i - 1].value) {
        isConsecutiveRising = false;
        break;
      }
    }

    // 连续上升且最后一个点 > 80
    if (isConsecutiveRising && metric.value > 80) {
      await this.createAnomaly(metric, 'cpu_continuous_spike', 'medium');
    }
  }

  /**
   * 算法 3：突变检测
   * 相邻两点差值 > 30
   */
  private async detectSuddenChange(metric: Metric) {
    if (metric.metricType !== 'cpu') return;

    const recent = await this.getRecentMetrics(metric.serverId, metric.metricType, 2);
    
    if (recent.length < 2) return;

    const diff = Math.abs(metric.value - recent[0].value);
    
    if (diff > 30) {
      await this.createAnomaly(metric, 'cpu_sudden_change', 'medium');
    }
  }
   /**
   * 创建异常记录
   */
  private async createAnomaly(
    metric: Metric,
    type: string,
    severity: string,
  ) {
    // 检查是否已有相同类型的未解决异常（避免重复）
    const existing = await this.prisma.anomaly.findFirst({
      where: {
        serverId: metric.serverId,
        type,
        status: 'open',
      },
    });

    if (existing) {
      this.logger.debug(`跳过重复异常: ${metric.serverId} ${type}`);
      return;
    }

    // 创建异常
    const anomaly = await this.prisma.anomaly.create({
      data: {
        serverId: metric.serverId,
        type,
        severity,
        status: 'open',
        rawData: {
          metric: {
            type: metric.metricType,
            value: metric.value,
          },
        },
      },
    });

    this.logger.warn(
      `🚨 检测到异常: ${anomaly.serverId} - ${anomaly.type} (${anomaly.severity})`,
    );

    // 发射 anomaly.detected 事件（Day 6 的 Agent 会监听）
    this.eventEmitter.emit('anomaly.detected', anomaly);
  }
 /**
   * 查询最近的指标（倒序）
   */
  private async getRecentMetrics(
    serverId: string,
    metricType: string,
    limit: number,
  ) {
    return this.prisma.metric.findMany({
      where: { serverId, metricType },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }




}
