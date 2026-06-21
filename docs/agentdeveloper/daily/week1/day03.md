# Day 3：模拟数据源 + 定时任务 + EventEmitter

**日期**：Day 3（周三晚）  
**时长**：2 小时  
**项目**：P1 智能异常监控平台

## 🎯 今日目标

- 学习 NestJS 定时任务
- 学习 EventEmitter 事件驱动
- 每 5 秒自动生成模拟指标数据
- 搭建事件驱动架构基础

## 📚 学习知识点

### 核心知识点
- **B3. 模拟数据源**
  - @nestjs/schedule（定时任务）
  - Cron 表达式
  - 模拟真实指标波动
  
- **B4. 事件驱动架构**
  - @nestjs/event-emitter
  - EventEmitter2 模式
  - 解耦业务模块

### 为什么学这个
```
事件驱动是后端核心模式：
  传统模式：MetricsService 直接调用 DetectorService
  ✅ 事件驱动：MetricsService emit 事件 → DetectorService 监听
  
优势：
  - 模块解耦：Metrics 不需要知道 Detector 存在
  - 易扩展：新增监听器无需改动发射方
  - 易测试：可以单独测试每个模块

定时任务的真实场景：
  - 监控系统：定期采集指标
  - 定时报告：每天生成报表
  - 数据清理：定期删除旧数据
```

## 📖 学习材料（25 分钟）

### 必读
1. **NestJS Task Scheduling 文档**（15 分钟）
   - 网址：https://docs.nestjs.cn/10/techniques?id=task-scheduling
   - 重点：Cron 表达式语法
   - 重点：@Cron() 装饰器用法

2. **NestJS Events 文档**（10 分钟）
   - 网址：https://docs.nestjs.cn/10/techniques?id=events
   - 重点：@OnEvent() 装饰器
   - 重点：EventEmitter2 API

### Cron 表达式速查
```
秒 分 时 日 月 周
*  *  *  *  *  *

例子：
"*/5 * * * * *"  → 每 5 秒
"0 * * * * *"    → 每分钟的第 0 秒
"0 0 9 * * *"    → 每天 9:00
"0 0 * * * 1-5"  → 工作日每小时
```

## 💻 编码任务（95 分钟）

### 任务 1：安装依赖（5 分钟）

```bash
cd ~/projects/p1-monitor/backend

pnpm add @nestjs/schedule @nestjs/event-emitter
```

在 `app.module.ts` 注册：

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(), // 启用定时任务
    EventEmitterModule.forRoot(), // 启用事件
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}
```

---

### 任务 2：创建 MetricsModule（30 分钟）

```bash
nest g module modules/metrics
nest g service modules/metrics
```

#### 编写 MetricsService

修改 `src/modules/metrics/metrics.service.ts`：

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  // 每 5 秒执行一次
  @Cron('*/5 * * * * *')
  async generateMetrics() {
    this.logger.debug('⏰ 生成模拟指标数据...');

    // 获取所有在线服务器
    const servers = await this.prisma.server.findMany({
      where: { status: 'online' },
    });

    // 为每台服务器生成指标
    for (const server of servers) {
      const metrics = this.simulateMetrics(server.id);
      
      // 批量插入数据库
      await this.prisma.metric.createMany({
        data: metrics,
      });

      // 发射事件（重要！）
      this.eventEmitter.emit('metric.created', metrics);
    }

    this.logger.debug(`✅ 生成了 ${servers.length * 4} 条指标`);
  }

  /**
   * 模拟真实指标数据
   * 90% 概率正常波动，10% 概率异常
   */
  private simulateMetrics(serverId: string) {
    // 随机决定是否异常
    const isAnomaly = Math.random() < 0.1;

    return [
      {
        serverId,
        metricType: 'cpu',
        value: isAnomaly 
          ? 85 + Math.random() * 15  // 异常：85-100%
          : 20 + Math.random() * 50, // 正常：20-70%
        unit: '%',
      },
      {
        serverId,
        metricType: 'memory',
        value: 40 + Math.random() * 40, // 40-80%
        unit: '%',
      },
      {
        serverId,
        metricType: 'temperature',
        value: isAnomaly
          ? 32 + Math.random() * 5   // 异常：32-37°C
          : 22 + Math.random() * 8,  // 正常：22-30°C
        unit: '°C',
      },
      {
        serverId,
        metricType: 'disk_io',
        value: 10 + Math.random() * 90, // 10-100 MB/s
        unit: 'MB/s',
      },
    ];
  }

  /**
   * 手动触发生成（用于测试）
   */
  async generateOnce() {
    await this.generateMetrics();
  }
}
```

#### 理解代码（用 Claude Code）

问 Claude Code：
```
1. @Cron('*/5 * * * * *') 做了什么？
2. eventEmitter.emit('metric.created', metrics) 有什么作用？
3. 如果我想改成每 10 秒，怎么改？
```

---

### 任务 3：测试数据生成（15 分钟）

#### 添加测试接口

修改 `src/modules/metrics/metrics.service.ts`，在文件末尾再暴露一个方法：

```typescript
// ... 前面代码不变

/**
 * 查询最近的指标
 */
async getRecentMetrics(serverId: string, metricType: string, limit = 20) {
  return this.prisma.metric.findMany({
    where: { serverId, metricType },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}
```

创建 `src/modules/metrics/metrics.controller.ts`（手动创建）：

```typescript
import { Controller, Get, Param, Query } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('api/metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get('recent/:serverId')
  async getRecent(
    @Param('serverId') serverId: string,
    @Query('type') type: string,
    @Query('limit') limit?: string,
  ) {
    return this.metricsService.getRecentMetrics(
      serverId,
      type || 'cpu',
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('generate')
  async generate() {
    await this.metricsService.generateOnce();
    return { message: '手动生成完成' };
  }
}
```

在 `metrics.module.ts` 注册 Controller：

```typescript
import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';

@Module({
  providers: [MetricsService],
  controllers: [MetricsController],
})
export class MetricsModule {}
```

#### 测试

```bash
# 手动触发生成
curl http://localhost:3000/api/metrics/generate

# 查询最近数据
curl "http://localhost:3000/api/metrics/recent/srv-001?type=cpu&limit=10"

# 应该看到 10 条 CPU 指标数据
```

#### 观察自动生成

看后端控制台日志，每 5 秒应该看到：
```
[MetricsService] ⏰ 生成模拟指标数据...
[MetricsService] ✅ 生成了 40 条指标
```

打开 Prisma Studio，刷新 metrics 表，数据应该在持续增长。

---

### 任务 4：创建事件监听器（30 分钟）

#### 创建 EventLoggerService（用于测试事件）

```bash
nest g module modules/event-logger
nest g service modules/event-logger
```

修改 `src/modules/event-logger/event-logger.service.ts`：

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class EventLoggerService {
  private readonly logger = new Logger(EventLoggerService.name);

  @OnEvent('metric.created')
  handleMetricCreated(metrics: any[]) {
    // 只记录 CPU 异常
    const cpuMetrics = metrics.filter(m => m.metricType === 'cpu');
    const highCpu = cpuMetrics.filter(m => m.value > 80);
    
    if (highCpu.length > 0) {
      this.logger.warn(
        `🔴 检测到 ${highCpu.length} 个高 CPU：` +
        highCpu.map(m => `${m.serverId}=${m.value.toFixed(1)}%`).join(', ')
      );
    }
  }

  @OnEvent('anomaly.detected')
  handleAnomalyDetected(anomaly: any) {
    this.logger.error(`🚨 异常检测: ${anomaly.serverId} - ${anomaly.type}`);
  }
}
```

#### 测试事件

重启后端，观察日志。当 CPU > 80% 时应该看到：
```
[EventLoggerService] 🔴 检测到 1 个高 CPU：srv-003=92.5%
```

#### 理解事件驱动（重要！）

用 Claude Code 画图：
```
请用 Mermaid 画出事件驱动的流程：
1. MetricsService 定时生成数据
2. 插入数据库
3. emit('metric.created', data)
4. EventLoggerService 监听事件
5. 处理并打印日志

标注"松耦合"的特点。
```

---

### 任务 5：数据清理策略（15 分钟）

指标数据会无限增长，需要定期清理。

在 `metrics.service.ts` 添加：

```typescript
// 每天凌晨 3:00 清理 7 天前的数据
@Cron('0 0 3 * * *')
async cleanOldMetrics() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const result = await this.prisma.metric.deleteMany({
    where: {
      timestamp: {
        lt: sevenDaysAgo,
      },
    },
  });

  this.logger.log(`🗑️ 清理了 ${result.count} 条旧指标数据`);
}
```

**测试清理逻辑**（手动触发）：

```typescript
// 在 metrics.controller.ts 添加测试接口
@Get('clean')
async clean() {
  // 删除 1 分钟前的数据（测试用）
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const result = await this.prisma.metric.deleteMany({
    where: { timestamp: { lt: oneMinuteAgo } },
  });
  return { deleted: result.count };
}
```

---

## ✅ 验收清单

- [ ] 后端启动后，每 5 秒自动生成指标数据
- [ ] 后端日志能看到 `✅ 生成了 40 条指标`
- [ ] Prisma Studio 里 metrics 表数据持续增长
- [ ] 当 CPU > 80% 时，日志显示 `🔴 检测到高 CPU`
- [ ] `curl .../metrics/recent/srv-001?type=cpu` 能返回数据
- [ ] 能用自己的话解释：事件驱动 vs 直接调用的区别
- [ ] git commit 已提交

## 🤔 思考题

1. **如果我想停止某个 Cron 任务怎么办？**
   - 提示：SchedulerRegistry

2. **EventEmitter 是同步还是异步？**
   - 如果监听器报错，会影响发射方吗？

3. **为什么不直接在 MetricsService 里调用 DetectorService？**
   - 事件驱动的真正价值在哪？

## 💡 扩展思考

### 真实场景的数据采集

在真实项目中，指标数据来源：
- Prometheus 采集
- 设备主动上报（MQTT/HTTP）
- SSH 登录服务器执行命令
- 云厂商 API（阿里云监控 API）

我们用定时任务模拟，是为了学习后端架构，Day 5 之后会接入真正的 AI Agent。

## 📝 今日总结

**学到了什么**：
- NestJS 定时任务（@Cron）
- EventEmitter 事件驱动架构
- 时序数据的模拟与清理

**明天预告**：
- Day 4：异常检测引擎
- 3 种检测算法（阈值 / 突增 / 趋势）
- 监听 metric.created 事件自动检测

---

**Day 3 完成！明天见 🚀**
