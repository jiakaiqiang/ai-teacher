# Day 4：异常检测引擎

**日期**：Day 4（周四晚）  
**时长**：2 小时  
**项目**：P1 智能异常监控平台

## 🎯 今日目标

- 实现 3 种异常检测算法
- 监听 metric.created 事件自动检测
- 异常数据入库
- 触发 anomaly.detected 事件

## 📚 学习知识点

### 核心知识点
- **B4. 异常检测算法**
  - 静态阈值检测   就是设置一个阈值超过则会触发告警
  - 动态基线检测（3σ 原则）
  - 连续突增检测
  - 突变检测

### 为什么学这个
```
监控系统的核心价值：
  ❌ 传统告警：CPU > 80% 就告警 → 误报率高
  ✅ 智能检测：基于历史基线 + 多维度判断 → 准确率高

真实场景：
  - 双 11 大促：CPU 100% 是正常的
  - 半夜 3 点：CPU 50% 就是异常
  - 需要动态基线，不能硬阈值
```

## 📖 学习材料（20 分钟）

### 必读
1. **文章：「时序数据异常检测算法」**（15 分钟）
   - 搜索关键词：时序异常检测 3sigma
   - 重点：理解 3σ 原则
   - 重点：滑动窗口算法

2. **快速预览：Prometheus 告警规则**（5 分钟）
   - 了解工业界怎么做异常检测

## 💻 编码任务（100 分钟）

### 任务 1：创建 AnomalyDetectorModule（45 分钟）

```bash
cd ~/projects/p1-monitor/backend

nest g module modules/anomaly-detector
nest g service modules/anomaly-detector
```

#### 编写核心检测逻辑

修改 `src/modules/anomaly-detector/anomaly-detector.service.ts`：

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';

interface Metric {
  serverId: string;
  metricType: string;
  value: number;
  timestamp?: Date;
}

@Injectable()
export class AnomalyDetectorService {
  private readonly logger = new Logger(AnomalyDetectorService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * 监听 metric.created 事件
   */
  @OnEvent('metric.created')
  async detectAnomalies(metrics: Metric[]) {
    for (const metric of metrics) {
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
  }

  /**
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
```

---

### 任务 2：测试异常检测（20 分钟）

#### 方法 1：观察自动检测

后端日志应该每隔一段时间（不是每次都有）看到：
```
[AnomalyDetectorService] 🚨 检测到异常: srv-003 - cpu_spike (high)
[EventLoggerService] 🚨 异常检测: srv-003 - cpu_spike
```

#### 方法 2：手动触发异常

在 `metrics.service.ts` 添加一个专门生成异常的方法：

```typescript
/**
 * 手动生成异常数据（用于测试）
 */
async generateAnomalyData(serverId: string) {
  const metrics = [
    {
      serverId,
      metricType: 'cpu',
      value: 98, // 明确超过阈值
      unit: '%',
    },
    {
      serverId,
      metricType: 'temperature',
      value: 36, // 温度异常
      unit: '°C',
    },
  ];

  await this.prisma.metric.createMany({ data: metrics });
  this.eventEmitter.emit('metric.created', metrics);

  return { message: '已生成异常数据' };
}
```

在 `metrics.controller.ts` 添加测试接口：

```typescript
@Get('anomaly/:serverId')
async generateAnomaly(@Param('serverId') serverId: string) {
  return this.metricsService.generateAnomalyData(serverId);
}
```

**测试**：
```bash
curl http://localhost:3000/api/metrics/anomaly/srv-001

# 后端日志应该立即看到：
# 🚨 检测到异常: srv-001 - cpu_spike (critical)
# 🚨 检测到异常: srv-001 - temperature_high (critical)
```

#### 验证数据库

打开 Prisma Studio，查看 anomalies 表，应该有新数据：
```
id: xxx
serverId: srv-001
type: cpu_spike
severity: critical
status: open
detectedAt: 2026-06-18 21:30:00
```

---

### 任务 3：异常查询 API（25 分钟）

创建 AnomalyController：

```bash
nest g controller modules/anomaly-detector
```

修改 `src/modules/anomaly-detector/anomaly-detector.controller.ts`：

```typescript
import { Controller, Get, Query, Param, Patch } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('api/anomalies')
export class AnomalyDetectorController {
  constructor(private prisma: PrismaService) {}

  /**
   * 查询异常列表
   */
  @Get()
  async list(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('limit') limit?: string,
  ) {
    return this.prisma.anomaly.findMany({
      where: {
        ...(status && { status }),
        ...(severity && { severity }),
      },
      orderBy: { detectedAt: 'desc' },
      take: limit ? parseInt(limit) : 50,
      include: {
        server: true, // 关联查询服务器信息
      },
    });
  }

  /**
   * 查询单个异常详情
   */
  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.prisma.anomaly.findUnique({
      where: { id },
      include: {
        server: true,
        diagnosis: true, // 关联诊断记录（Day 6 会有）
      },
    });
  }

  /**
   * 标记异常为已解决
   */
  @Patch(':id/resolve')
  async resolve(@Param('id') id: string) {
    return this.prisma.anomaly.update({
      where: { id },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
      },
    });
  }

  /**
   * 忽略异常
   */
  @Patch(':id/ignore')
  async ignore(@Param('id') id: string) {
    return this.prisma.anomaly.update({
      where: { id },
      data: { status: 'ignored' },
    });
  }
}
```

在 `anomaly-detector.module.ts` 注册 Controller：

```typescript
import { Module } from '@nestjs/common';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { AnomalyDetectorController } from './anomaly-detector.controller';

@Module({
  providers: [AnomalyDetectorService],
  controllers: [AnomalyDetectorController],
})
export class AnomalyDetectorModule {}
```

**测试 API**：

```bash
# 查询所有异常
curl http://localhost:3000/api/anomalies

# 查询未解决的异常
curl "http://localhost:3000/api/anomalies?status=open"

# 查询高严重度异常
curl "http://localhost:3000/api/anomalies?severity=high"

# 标记为已解决
curl -X PATCH http://localhost:3000/api/anomalies/{异常ID}/resolve

# 查询单个异常详情
curl http://localhost:3000/api/anomalies/{异常ID}
```

---

### 任务 4：单元测试（可选，10 分钟）

创建 `src/modules/anomaly-detector/anomaly-detector.service.spec.ts`：

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('AnomalyDetectorService', () => {
  let service: AnomalyDetectorService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnomalyDetectorService,
        {
          provide: PrismaService,
          useValue: {
            anomaly: {
              findFirst: jest.fn(),
              create: jest.fn(),
            },
            metric: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AnomalyDetectorService>(AnomalyDetectorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should detect CPU spike when value > 85', async () => {
    const metric = {
      serverId: 'srv-001',
      metricType: 'cpu',
      value: 90,
    };

    jest.spyOn(prisma.anomaly, 'findFirst').mockResolvedValue(null);
    jest.spyOn(prisma.anomaly, 'create').mockResolvedValue({} as any);

    await service['detectStaticThreshold'](metric);

    expect(prisma.anomaly.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'cpu_spike',
          severity: 'high',
        }),
      }),
    );
  });
});
```

运行测试：
```bash
pnpm test
```

---

## ✅ 验收清单

- [ ] 后端日志能看到 `🚨 检测到异常` 消息
- [ ] Prisma Studio 里 anomalies 表有数据
- [ ] `curl /api/anomalies` 能返回异常列表
- [ ] `curl /api/anomalies/{id}` 能返回详情（含 server 关联）
- [ ] `curl /api/metrics/anomaly/srv-001` 能手动触发异常
- [ ] 单元测试通过（如果写了）
- [ ] git commit 已提交

## 🤔 思考题

1. **为什么要检查 existing 异常避免重复？**
   - 如果不检查会怎样？

2. **连续突增检测的 5 个点，为什么是倒序查询？**
   - 如果用正序会有什么问题？

3. **如何实现动态基线检测（3σ）？**
   - 需要计算历史均值和标准差
   - 提示：可以查询过去 7 天同时段的数据

## 💡 扩展挑战（可选）

### 实现动态基线检测

```typescript
/**
 * 算法 4：动态基线检测（3σ 原则）
 */
private async detectDynamicBaseline(metric: Metric) {
  if (metric.metricType !== 'cpu') return;

  // 查询过去 7 天同时段的数据（如当前是 21:00，查过去 7 天 21:00 的数据）
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const historical = await this.prisma.metric.findMany({
    where: {
      serverId: metric.serverId,
      metricType: metric.metricType,
      timestamp: { gte: sevenDaysAgo },
    },
  });

  if (historical.length < 10) return; // 数据不够

  // 计算均值和标准差
  const values = historical.map(m => m.value);
  const mean = values.reduce((a, b) => a + b) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // 3σ 原则：超过 mean + 3*stdDev 视为异常
  if (metric.value > mean + 3 * stdDev) {
    await this.createAnomaly(metric, 'cpu_baseline_deviation', 'medium');
  }
}
```

## 📝 今日总结

**学到了什么**：
- 3 种异常检测算法实现
- 事件驱动架构的实战应用
- Prisma 关联查询（include）

**明天预告**：
- Day 5：DeepSeek 集成 + Tool Calling
- 定义 5 个工业工具
- 实现第一个 AI 调用

---

**Day 4 完成！明天见 🚀**
