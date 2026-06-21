# P1 智能异常监控平台 - 架构设计文档

## 📋 文档信息

| 项目 | 信息 |
|------|------|
| **项目名称** | 智能异常监控平台 |
| **架构版本** | v1.0 |
| **目标周期** | Day 1-15 |

## 1. 整体架构

### 1.1 分层架构

```
┌────────────────────────────────────────────────────┐
│                    展示层（前端）                    │
│  Vue 3 + Element Plus + Echarts + socket.io-client │
└────────────────────────────────────────────────────┘
                          ↕
┌────────────────────────────────────────────────────┐
│                    接入层                            │
│       NestJS Controller + WebSocket Gateway         │
└────────────────────────────────────────────────────┘
                          ↕
┌────────────────────────────────────────────────────┐
│                    业务层                            │
│  Auth + Metrics + AnomalyDetector + Agent + Chat   │
└────────────────────────────────────────────────────┘
                          ↕
┌────────────────────────────────────────────────────┐
│                    数据层                            │
│         Prisma ORM + Postgres + Redis              │
└────────────────────────────────────────────────────┘
                          ↕
┌────────────────────────────────────────────────────┐
│                    AI 层                             │
│      Vercel AI SDK + DeepSeek + Tool Calling       │
└────────────────────────────────────────────────────┘
```

### 1.2 模块划分

```mermaid
graph TB
    subgraph "前端"
        UI[Vue 3 UI]
        Store[Pinia Store]
        Charts[Echarts 图表]
    end
    
    subgraph "后端业务模块"
        Auth[Auth 鉴权]
        Metrics[指标管理]
        Detector[异常检测]
        Agent[Agent 服务]
        Chat[Chat 服务]
        Gateway[WebSocket]
    end
    
    subgraph "基础设施"
        Prisma[Prisma]
        Postgres[(Postgres)]
        EventBus[Event Bus]
        AI[Vercel AI SDK]
    end
    
    UI --> Auth
    UI --> Charts
    Store --> Gateway
    
    Auth --> Prisma
    Metrics --> Prisma
    Detector --> Prisma
    Agent --> AI
    Chat --> AI
    
    Metrics --> EventBus
    EventBus --> Detector
    Detector --> EventBus
    EventBus --> Agent
    
    Prisma --> Postgres
```

## 2. 核心数据流

### 2.1 异常检测 + 自动诊断流程

```mermaid
sequenceDiagram
    participant Cron as 定时任务
    participant Metrics as Metrics Service
    participant DB as Postgres
    participant Bus as Event Bus
    participant Detector as Detector Service
    participant Agent as Agent Service
    participant LLM as DeepSeek
    participant WS as WebSocket
    participant UI as 前端

    Cron->>Metrics: 每 5s 触发
    Metrics->>Metrics: 生成模拟指标
    Metrics->>DB: 批量插入
    Metrics->>Bus: emit('metric.created')
    
    par 并发处理
        Bus->>Detector: 监听
        Detector->>Detector: 3 类算法检测
        alt 检测到异常
            Detector->>DB: 创建 anomaly
            Detector->>Bus: emit('anomaly.detected')
        end
    and
        Bus->>WS: 推送指标
        WS->>UI: 实时更新图表
    end
    
    Bus->>Agent: 监听异常
    Agent->>DB: 更新状态为 diagnosing
    Agent->>LLM: streamText + tools
    
    loop 多步工具调用
        LLM->>Agent: tool-call
        Agent->>DB: 查询数据
        Agent->>LLM: tool-result
    end
    
    LLM->>Agent: 最终诊断
    Agent->>DB: 创建 diagnosis
    Agent->>DB: 更新 anomaly 为 resolved
    Agent->>WS: 推送诊断结果
    WS->>UI: 显示诊断详情
```

### 2.2 用户聊天流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant UI as 前端
    participant Chat as Chat Controller
    participant Agent as Agent Service
    participant LLM as DeepSeek
    participant Tools as 工具集
    participant DB as 数据库

    User->>UI: 输入问题
    UI->>Chat: POST /api/chat/stream
    Chat->>Agent: chatWithTools(messages)
    Agent->>LLM: streamText + tools
    
    loop 多轮工具调用
        LLM->>Agent: tool-call
        Agent->>Tools: execute(args)
        Tools->>DB: 查询
        DB-->>Tools: 数据
        Tools-->>Agent: 结果
        Agent->>LLM: tool-result
    end
    
    LLM-->>Agent: 流式返回文本
    Agent-->>Chat: 流式返回
    Chat-->>UI: SSE 流式响应
    UI-->>User: 逐字显示
```

## 3. 关键技术决策

### 3.1 为什么选 NestJS

| 维度 | NestJS | Express |
|------|--------|---------|
| 架构 | 强制模块化 | 无约定 |
| TypeScript | 原生支持 | 需配置 |
| 学习曲线 | 中（值得） | 低 |
| 大型项目 | 优秀 | 需自己搭 |
| 社区 | 活跃 | 庞大 |

### 3.2 为什么选 Postgres + pgvector

| 维度 | 选择 |
|------|------|
| 关系数据 | Postgres ✅ |
| JSON 数据 | Postgres JSONB ✅ |
| 时序数据 | Postgres + 时间索引 ✅ |
| 向量数据 | pgvector ✅（P2 用） |
| 全文检索 | Postgres FTS ✅（P2 用） |

**一个数据库搞定所有需求，省去维护多个数据库的复杂度。**

### 3.3 为什么选 Vercel AI SDK

| 维度 | Vercel AI SDK | LangChain.js |
|------|--------------|--------------|
| 学习曲线 | 简单 | 复杂 |
| Tool Calling | 原生支持 | 需要 Chain |
| 流式 | 完美 | 良好 |
| TypeScript | 一流 | 良好 |
| Multi-step | maxSteps | 需自己实现 |

**P1 用 Vercel AI SDK 快速起步，P2/P3 再引入 LangChain.js。**

## 4. 性能架构

### 4.1 性能瓶颈与对策

| 瓶颈 | 现象 | 对策 |
|------|------|------|
| 数据库写入 | 大量指标 | 批量写入 + 索引优化 |
| WebSocket 推送 | 高频消息 | 节流 + 数据压缩 |
| Agent 调用 | API 延迟 | Prompt Cache + 并行工具 |
| 前端渲染 | Echarts 卡顿 | dataZoom + 滑动窗口 |
| 内存占用 | 长时间运行 | 定期清理 + WeakMap |

### 4.2 Scalability（扩展性）

```
当前架构（单机）：
  - 10 台模拟服务器
  - 50 并发用户
  - 200 QPS

未来扩展（水平扩展）：
  - Redis：缓存 + Pub/Sub
  - 多个后端实例：负载均衡
  - 分库分表：时序数据
  - CDN：静态资源
```

## 5. 安全架构

### 5.1 鉴权与授权

```
鉴权：JWT
  - Access Token（1 小时）
  - Refresh Token（7 天）
  - Token 黑名单（Redis）

授权：RBAC
  - admin：所有权限
  - operator：可操作工单
  - viewer：仅查看
```

### 5.2 数据安全

```
传输：HTTPS（Caddy 自动证书）
存储：密码 bcrypt + JWT secret 长度 ≥ 32
SQL 注入：Prisma 参数化查询
XSS：Vue 自动转义
CSRF：JWT + SameSite Cookie
```

### 5.3 API 安全

```
限流：@nestjs/throttler
  - 全局：100 req/min
  - 登录：5 req/min（防暴力破解）
  - AI：10 req/min（防滥用）

输入验证：class-validator
  - 所有 DTO 严格校验
  - 长度 / 格式 / 枚举
```

## 6. 监控架构

### 6.1 应用监控

```
日志：Winston / Pino
  - 结构化 JSON 日志
  - 按级别分级（error / warn / info / debug）
  - 关键事件全记录

指标：Prometheus（可选）
  - QPS / 延迟 / 错误率
  - 数据库连接池
  - Agent 调用统计

错误：Sentry
  - 前端错误自动上报
  - 后端异常捕获
  - Source Map 反混淆
```

### 6.2 业务监控

```
Agent 性能：
  - 诊断耗时 P50/P95/P99
  - 工具调用次数
  - 失败率

数据库性能：
  - 慢查询（> 100ms）
  - 连接池使用率
  - 表大小增长

业务指标：
  - 异常数量趋势
  - 自动修复率
  - 用户活跃度
```

## 7. 部署架构

### 7.1 Docker 部署

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: monitor
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  backend:
    build: ./backend
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/monitor
      REDIS_URL: redis://redis:6379

  frontend:
    build: ./frontend
    depends_on:
      - backend

  caddy:
    image: caddy:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
```

### 7.2 生产部署清单

```
□ 域名 + DNS 解析
□ SSL 证书（Caddy 自动）
□ 服务器（腾讯云轻量 2C4G）
□ 防火墙规则
□ 数据库备份策略
□ 日志收集
□ 监控告警
□ 灾备方案
```

## 8. 演进路线

```
P1（Day 1-15）：单机版
  └── NestJS + Postgres + 单 Agent

P2（Day 16-30）：知识库版
  └── + pgvector + LangChain.js + RAG

P3（Day 31-45）：多 Agent 版
  └── + LangGraph.js + 自动修复

P4（Day 46-60）：3D 平台版
  └── + Three.js + 多模态 + 生产化
```

---

**这份架构是 60 天计划的技术基石！**
