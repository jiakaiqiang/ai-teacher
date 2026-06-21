# Day 8：WebSocket + Echarts 实时大盘

**日期**：Day 8（周一晚）  
**时长**：2 小时  
**项目**：P1 智能异常监控平台

## 🎯 今日目标

- 集成 @nestjs/websockets
- 实时推送指标数据
- Echarts 实时图表渲染
- 实现滑动窗口显示

## 📚 学习知识点

### 核心知识点
- **B1. WebSocket（NestJS Gateway）**
  - @WebSocketGateway 装饰器
  - @SubscribeMessage
  - server.emit 推送
  
- **D2. Echarts 实时图表**
  - 数据流式更新
  - 滑动窗口
  - 性能优化

### 为什么学这个
```
实时监控的核心：
  ❌ 轮询：前端每 5s 请求一次 API
  ✅ WebSocket：服务端主动推送，延迟 < 100ms

Echarts 的挑战：
  - 数据量大：10 台设备 × 4 指标 = 40 条/5s
  - 长时间运行：需要滑动窗口，防止内存泄漏
  - 60fps 流畅：需要性能优化
```

## 📖 学习材料（20 分钟）

### 必读
1. **NestJS WebSockets 文档**（15 分钟）
   - 网址：https://docs.nestjs.cn/10/websockets
   - 重点：@WebSocketGateway 用法
   - 重点：房间（Room）管理

2. **Echarts 实时数据更新**（5 分钟）
   - 官网示例：Dynamic Data
   - 重点：setOption({ series[0].data }) 增量更新

## 💻 编码任务（100 分钟）

### 任务 1：后端 WebSocket Gateway（40 分钟）

#### 安装依赖
```bash
cd ~/projects/p1-monitor/backend
pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
```

#### 创建 MonitorGateway

```bash
nest g module modules/monitor-gateway
nest g service modules/monitor-gateway
```

创建 `src/modules/monitor-gateway/monitor.gateway.ts`：

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: { origin: '*' }, // 生产环境要改成具体域名
  namespace: '/monitor',
})
export class MonitorGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MonitorGateway.name);

  constructor(private jwtService: JwtService) {}

  /**
   * 客户端连接
   */
  async handleConnection(client: Socket) {
    try {
      // JWT 鉴权
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.data.username = payload.username;

      this.logger.log(`客户端连接: ${client.id} (${payload.username})`);
    } catch (error) {
      this.logger.error('WebSocket 鉴权失败', error);
      client.disconnect();
    }
  }

  /**
   * 客户端断开
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`客户端断开: ${client.id}`);
  }

  /**
   * 监听 metric.created 事件，推送实时指标
   */
  @OnEvent('metric.created')
  pushMetrics(metrics: any[]) {
    this.server.emit('metrics', metrics);
  }

  /**
   * 监听 anomaly.detected 事件，推送异常
   */
  @OnEvent('anomaly.detected')
  pushAnomaly(anomaly: any) {
    this.server.emit('anomaly', {
      id: anomaly.id,
      serverId: anomaly.serverId,
      type: anomaly.type,
      severity: anomaly.severity,
      detectedAt: anomaly.detectedAt,
    });
  }

  /**
   * 监听诊断完成，推送诊断结果
   */
  pushDiagnosis(anomalyId: string, diagnosis: any) {
    this.server.emit('diagnosis', {
      anomalyId,
      conclusion: diagnosis.conclusion,
      action: diagnosis.action,
      durationMs: diagnosis.durationMs,
    });
  }

  /**
   * 客户端订阅特定服务器
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, serverId: string) {
    client.join(`server:${serverId}`);
    this.logger.debug(`${client.id} 订阅了 ${serverId}`);
    return { event: 'subscribed', data: serverId };
  }
}
```

在 `monitor-gateway.module.ts` 注册：

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MonitorGateway } from './monitor.gateway';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
    }),
  ],
  providers: [MonitorGateway],
})
export class MonitorGatewayModule {}
```

在 `app.module.ts` 导入：

```typescript
imports: [
  // ... 其他 imports
  MonitorGatewayModule,
],
```

---

### 任务 2：前端 WebSocket 连接（30 分钟）

#### 安装依赖

```bash
cd ~/projects/p1-monitor/frontend
pnpm add socket.io-client
```

#### 创建 Pinia Store

创建 `src/stores/monitor.ts`：

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { io, Socket } from 'socket.io-client';

interface Metric {
  serverId: string;
  metricType: string;
  value: number;
  unit?: string;
  timestamp: Date;
}

interface Anomaly {
  id: string;
  serverId: string;
  type: string;
  severity: string;
  detectedAt: Date;
}

export const useMonitorStore = defineStore('monitor', () => {
  const socket = ref<Socket | null>(null);
  const connected = ref(false);
  
  // 实时指标数据（只保留最近 100 个点）
  const metrics = ref<Metric[]>([]);
  
  // 异常列表
  const anomalies = ref<Anomaly[]>([]);
  
  // 诊断记录
  const diagnoses = ref<any[]>([]);

  /**
   * 连接 WebSocket
   */
  function connect(token: string) {
    socket.value = io('http://localhost:3000/monitor', {
      auth: { token },
    });

    socket.value.on('connect', () => {
      connected.value = true;
      console.log('✅ WebSocket 连接成功');
    });

    socket.value.on('disconnect', () => {
      connected.value = false;
      console.log('❌ WebSocket 断开');
    });

    // 监听实时指标
    socket.value.on('metrics', (data: Metric[]) => {
      metrics.value.push(...data);
      
      // 保持最近 100 个点（滑动窗口）
      if (metrics.value.length > 100) {
        metrics.value = metrics.value.slice(-100);
      }
    });

    // 监听异常
    socket.value.on('anomaly', (data: Anomaly) => {
      anomalies.value.unshift(data);
    });

    // 监听诊断
    socket.value.on('diagnosis', (data: any) => {
      diagnoses.value.unshift(data);
    });
  }

  /**
   * 断开连接
   */
  function disconnect() {
    socket.value?.disconnect();
    socket.value = null;
    connected.value = false;
  }

  /**
   * 订阅特定服务器
   */
  function subscribe(serverId: string) {
    socket.value?.emit('subscribe', serverId);
  }

  /**
   * 按服务器和指标类型筛选数据
   */
  const getMetricsByServer = computed(() => {
    return (serverId: string, metricType: string) => {
      return metrics.value
        .filter(m => m.serverId === serverId && m.metricType === metricType)
        .map(m => ({
          timestamp: m.timestamp,
          value: m.value,
        }));
    };
  });

  return {
    socket,
    connected,
    metrics,
    anomalies,
    diagnoses,
    connect,
    disconnect,
    subscribe,
    getMetricsByServer,
  };
});
```

---

### 任务 3：Echarts 实时图表（30 分钟）

#### 安装 Echarts

```bash
pnpm add echarts
```

#### 创建实时图表组件

创建 `src/components/RealtimeChart.vue`：

```vue
<template>
  <div ref="chartRef" style="width: 100%; height: 300px"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as echarts from 'echarts';

const props = defineProps<{
  serverId: string;
  metricType: string;
  data: Array<{ timestamp: Date; value: number }>;
  title: string;
  unit?: string;
}>();

const chartRef = ref<HTMLElement | null>(null);
let chart: echarts.ECharts | null = null;

onMounted(() => {
  if (!chartRef.value) return;

  chart = echarts.init(chartRef.value);

  const option: echarts.EChartsOption = {
    title: {
      text: props.title,
      left: 'center',
      textStyle: { fontSize: 14 },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const item = params[0];
        return `${item.name}<br/>${item.value} ${props.unit || ''}`;
      },
    },
    xAxis: {
      type: 'category',
      data: [],
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      name: props.unit,
    },
    series: [
      {
        name: props.metricType,
        type: 'line',
        smooth: true,
        data: [],
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(58, 130, 246, 0.5)' },
              { offset: 1, color: 'rgba(58, 130, 246, 0.1)' },
            ],
          },
        },
      },
    ],
  };

  chart.setOption(option);
});

// 监听数据变化，更新图表
watch(
  () => props.data,
  (newData) => {
    if (!chart) return;

    const times = newData.map(d =>
      new Date(d.timestamp).toLocaleTimeString(),
    );
    const values = newData.map(d => d.value);

    chart.setOption({
      xAxis: { data: times },
      series: [{ data: values }],
    });
  },
  { deep: true },
);

onUnmounted(() => {
  chart?.dispose();
});
</script>
```

#### 创建监控大盘页面

创建 `src/views/Dashboard.vue`：

```vue
<template>
  <div class="dashboard">
    <div class="header">
      <h2>实时监控大盘</h2>
      <el-tag :type="connected ? 'success' : 'danger'">
        {{ connected ? '已连接' : '未连接' }}
      </el-tag>
    </div>

    <el-select v-model="selectedServer" placeholder="选择服务器" style="width: 200px; margin-bottom: 20px">
      <el-option label="srv-001" value="srv-001" />
      <el-option label="srv-002" value="srv-002" />
      <el-option label="srv-003" value="srv-003" />
    </el-select>

    <div class="charts">
      <RealtimeChart
        :serverId="selectedServer"
        metricType="cpu"
        :data="cpuData"
        title="CPU 使用率"
        unit="%"
      />
      <RealtimeChart
        :serverId="selectedServer"
        metricType="memory"
        :data="memoryData"
        title="内存使用率"
        unit="%"
      />
      <RealtimeChart
        :serverId="selectedServer"
        metricType="temperature"
        :data="temperatureData"
        title="温度"
        unit="°C"
      />
      <RealtimeChart
        :serverId="selectedServer"
        metricType="disk_io"
        :data="diskIoData"
        title="磁盘 IO"
        unit="MB/s"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useMonitorStore } from '@/stores/monitor';
import RealtimeChart from '@/components/RealtimeChart.vue';

const monitorStore = useMonitorStore();
const selectedServer = ref('srv-001');

const connected = computed(() => monitorStore.connected);

const cpuData = computed(() =>
  monitorStore.getMetricsByServer.value(selectedServer.value, 'cpu'),
);

const memoryData = computed(() =>
  monitorStore.getMetricsByServer.value(selectedServer.value, 'memory'),
);

const temperatureData = computed(() =>
  monitorStore.getMetricsByServer.value(selectedServer.value, 'temperature'),
);

const diskIoData = computed(() =>
  monitorStore.getMetricsByServer.value(selectedServer.value, 'disk_io'),
);

onMounted(() => {
  // 连接 WebSocket
  const token = localStorage.getItem('token');
  if (token) {
    monitorStore.connect(token);
  }
});

onUnmounted(() => {
  monitorStore.disconnect();
});
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.charts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
</style>
```

---

## ✅ 验收清单

- [ ] 后端 WebSocket Gateway 启动成功
- [ ] 前端能连接 WebSocket（connected: true）
- [ ] 4 个 Echarts 图表实时更新（每 5s）
- [ ] 切换服务器，图表数据正确切换
- [ ] 长时间运行不卡顿（测试 10 分钟）
- [ ] 控制台能看到 metrics 事件
- [ ] git commit 已提交

## 🤔 思考题

1. **WebSocket 和 HTTP 的区别？**
2. **如何实现 WebSocket 断线重连？**
3. **Echarts 数据更新的性能瓶颈在哪？**

## 📝 今日总结

**学到了什么**：
- NestJS WebSocket Gateway
- socket.io 事件监听
- Echarts 实时数据更新

**明天预告**：
- Day 9：异常列表 + 诊断详情 UI

---

**Day 8 完成！🚀**
