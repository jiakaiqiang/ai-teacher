# 智能异常监控平台（P1）

## 📋 项目概述

一个基于 AI Agent 的实时异常监控与自主诊断平台，能够自动检测工业设备指标异常，并通过 AI Agent 自主完成诊断、分析、决策的完整闭环。

**开发周期**：Day 1-15（60 天计划的第一个项目）

## 🎯 项目定位

### 核心价值
- **实时监控**：5 秒一次的指标采集，覆盖 CPU、内存、温度、IO 等
- **智能检测**：3 类异常检测算法（阈值 / 突增 / 趋势）
- **自主诊断**：Agent 在异常触发后 < 30s 内自动完成诊断
- **闭环决策**：自动判断处置方式（通知 / 工单 / 忽略）

### 技术亮点
- **实时数据流**：WebSocket 推送 + Echarts 流式渲染
- **事件驱动架构**：EventEmitter 解耦检测与诊断
- **单 Agent 自主性**：无需人工干预的完整诊断流程
- **工具调用链**：平均 5 步工具调用完成诊断

## 🏗 技术架构

### 技术栈

```
前端：
  - Vue 3 + TypeScript + Vite
  - Pinia（状态管理）
  - Element Plus（UI 组件）
  - Echarts（实时图表）
  - socket.io-client（WebSocket）

后端：
  - NestJS + TypeScript
  - Prisma ORM
  - Postgres（时序数据）
  - @nestjs/websockets + socket.io
  - @nestjs/schedule（定时任务）
  - @nestjs/event-emitter（事件驱动）

AI 层：
  - Vercel AI SDK
  - DeepSeek（主模型）
  - Tool Calling（5 个工业工具）

部署：
  - Docker + docker-compose
  - Caddy（HTTPS 反向代理）
  - 腾讯云轻量服务器
```

### 系统架构图

```mermaid
graph TB
    subgraph "前端层"
        UI[Vue 3 UI]
        Chart[Echarts 实时图表]
        WS_Client[WebSocket 客户端]
    end

    subgraph "后端层"
        API[NestJS API]
        WS_Gateway[WebSocket Gateway]
        Schedule[定时任务]
        EventBus[事件总线]
    end

    subgraph "业务层"
        MetricsService[指标生成服务]
        DetectorService[异常检测服务]
        AgentService[Agent 诊断服务]
    end

    subgraph "AI 层"
        DeepSeek[DeepSeek LLM]
        Tools[工具集]
    end

    subgraph "存储层"
        DB[(Postgres)]
    end

    UI --> API
    UI --> WS_Client
    WS_Client --> WS_Gateway
    
    Schedule --> MetricsService
    MetricsService --> DB
    MetricsService --> EventBus
    
    EventBus --> DetectorService
    DetectorService --> DB
    DetectorService --> EventBus
    
    EventBus --> AgentService
    AgentService --> DeepSeek
    AgentService --> Tools
    Tools --> DB
    AgentService --> WS_Gateway
    
    WS_Gateway --> WS_Client
```

### 数据流图

```mermaid
sequenceDiagram
    participant Schedule as 定时任务
    participant Metrics as 指标服务
    participant Event as 事件总线
    participant Detector as 检测服务
    participant Agent as Agent 服务
    participant LLM as DeepSeek
    participant WS as WebSocket
    participant UI as 前端

    Schedule->>Metrics: 每 5s 触发
    Metrics->>Metrics: 生成模拟指标
    Metrics->>Event: emit('metric.created')
    Event->>Detector: 监听事件
    Detector->>Detector: 异常检测算法
    
    alt 检测到异常
        Detector->>Event: emit('anomaly.detected')
        Event->>Agent: 监听事件
        Agent->>Agent: 构建诊断 prompt
        Agent->>LLM: streamText + tools
        
        loop 多步工具调用
            LLM->>Agent: tool-call
            Agent->>Agent: 执行工具
            Agent->>LLM: tool-result
        end
        
        LLM->>Agent: 最终诊断结论
        Agent->>WS: 推送诊断结果
    end
    
    Metrics->>WS: 推送实时指标
    WS->>UI: 更新图表 + 异常列表
```

## 📊 数据模型

详见 [architecture/data-model.prisma](./architecture/data-model.prisma)

核心表：
- **Server**：服务器/设备信息
- **Metric**：实时指标时序数据
- **Anomaly**：异常记录
- **Diagnosis**：Agent 诊断记录
- **ToolCall**：工具调用记录

## 🎨 功能特性

### 1. 实时监控大盘
- 4 组实时折线图（CPU / 内存 / 温度 / IO）
- 滑动窗口显示最近 5 分钟数据
- 异常点自动标红
- 支持多设备切换

### 2. 异常检测引擎
- **静态阈值**：CPU > 80%、温度 > 32°C
- **动态基线**：相比历史均值偏离 3σ
- **趋势检测**：连续 5 个点上升
- **突变检测**：相邻点差值 > 阈值

### 3. AI Agent 自主诊断
- 异常触发后自动唤醒
- 5 步工具调用链：
  1. `getServerHealth`：查询当前状态
  2. `getMetricHistory`：分析历史趋势
  3. `queryHistoricalAnomalies`：找相似案例
  4. `generateDiagnosis`：生成诊断报告
  5. `createTicket`：决策是否创建工单

### 4. 实时通信
- WebSocket 双向通信
- 实时推送：指标 / 异常 / 诊断
- 断线自动重连
- JWT 鉴权

### 5. 用户交互
- Chat 浮层：主动询问异常情况
- 异常列表：实时更新状态
- 诊断详情：时间线展示 Agent 思考过程
- 配置中心：调整检测阈值

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- pnpm >= 8
- Postgres >= 14
- DeepSeek API Key

### 安装依赖

```bash
# 后端
cd backend
pnpm install

# 前端
cd frontend
pnpm install
```

### 配置环境变量

```bash
# backend/.env
DATABASE_URL="postgresql://user:pass@localhost:5432/monitor"
DEEPSEEK_API_KEY="sk-..."
JWT_SECRET="your-secret"
```

### 数据库迁移

```bash
cd backend
pnpm prisma migrate dev
pnpm prisma db seed  # 插入 mock 服务器数据
```

### 启动开发服务

```bash
# 后端（终端 1）
cd backend
pnpm start:dev

# 前端（终端 2）
cd frontend
pnpm dev
```

访问 http://localhost:5173

### Docker 部署

```bash
docker-compose up -d
```

访问 https://your-domain.com

## 📖 文档

- [PRD 产品需求文档](./docs/PRD.md)
- [架构设计文档](./docs/ARCHITECTURE.md)
- [用户画像分析](./docs/USER-PERSONA.md)
- [API 接口文档](./docs/API.md)
- [开发日志](../../docs/agentdeveloper/daily/week1/)

## 🧪 测试

```bash
# 单元测试
pnpm test

# E2E 测试
pnpm test:e2e

# 覆盖率报告
pnpm test:cov
```

## 📈 性能指标

- **Agent 诊断延迟**：P95 < 30s
- **WebSocket 延迟**：< 100ms
- **前端渲染帧率**：60fps（1000+ 数据点）
- **数据库查询**：P95 < 50ms
- **系统可用性**：99.5%+

## 🎓 学习价值

### 通过本项目你将掌握

#### NestJS 后端（占 35%）
- [x] Module / Controller / Service 架构
- [x] 依赖注入（DI）
- [x] Guards / Interceptors / Pipes / Filters
- [x] DTO + class-validator
- [x] JWT 鉴权
- [x] Swagger 自动文档

#### 实时数据栈（占 25%）
- [x] WebSocket Gateway
- [x] EventEmitter 事件驱动
- [x] 定时任务（@nestjs/schedule）
- [x] 时序数据处理
- [x] 异常检测算法

#### Vercel AI SDK（占 30%）
- [x] streamText / generateText
- [x] Tool Calling
- [x] Multi-step Agent
- [x] DeepSeek 集成
- [x] 事件驱动的 Agent 触发

#### 前端实时交互（占 10%）
- [x] socket.io-client
- [x] Echarts 实时图表
- [x] Pinia 复杂状态管理
- [x] Agent UI 时间线

## 🐛 已知问题

- [ ] 高并发下 WebSocket 可能丢消息（待优化）
- [ ] Agent 偶尔会重复调用工具（prompt 优化中）
- [ ] Echarts 长时间运行内存缓慢增长（已缓解）

## 🗺 后续扩展

本项目是 60 天计划的第一个项目，后续项目将基于此扩展：

- **P2（Day 16-30）**：增加 RAG 故障知识库
- **P3（Day 31-45）**：升级为多 Agent 协作系统
- **P4（Day 46-60）**：集成 Three.js 3D 机房可视化

## 📝 License

MIT

## 👤 作者

60 天 Agent 工程师学习计划 - P1 项目

---

**⭐ 如果这个项目对你有帮助，请给个 Star！**
