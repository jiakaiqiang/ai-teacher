# Day 5：DeepSeek 集成 + Tool Calling

**日期**：Day 5（周五晚）  
**时长**：2 小时  
**项目**：P1 智能异常监控平台

## 🎯 今日目标

- 接入 DeepSeek API
- 学习 Vercel AI SDK
- 实现第一个 Tool Calling
- 定义 5 个工业工具

## 📚 学习知识点

### 核心知识点
- **C1. Vercel AI SDK 基础**
  - generateText / streamText
  - Provider 配置
  - DeepSeek 集成
  
- **C2. Tool Calling 核心**
  - tool() 函数定义
  - Zod schema 参数定义
  - execute 实现工具逻辑

### 为什么学这个
```
Tool Calling 是 Agent 的核心能力：
  普通 LLM：只能对话，不能操作系统
  ✅ Tool Calling：LLM 可以调用函数、查数据库、执行命令

真实场景：
  - "查询 srv-001 的 CPU" → 调用 getServerHealth 工具
  - "过去 1 小时异常" → 调用 listAnomalies 工具
  - "创建工单" → 调用 createTicket 工具
```

## 📖 学习材料（30 分钟）

### 必读
1. **Vercel AI SDK 文档：Tool Calling**（20 分钟）
   - 网址：https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling
   - 重点：tool() 函数用法
   - 重点：Zod schema 语法

2. **DeepSeek API 文档**（10 分钟）
   - 网址：https://platform.deepseek.com/api-docs
   - 注册账号，拿到 API Key
   - 充值 10 元（够用很久）

### 获取 DeepSeek API Key

1. 访问 https://platform.deepseek.com
2. 注册账号（手机号）
3. 进入控制台 → API Keys → 创建新密钥
4. 复制 API Key（格式：sk-xxx）
5. 充值 10 元（新用户可能有免费额度）

## 💻 编码任务（90 分钟）

### 任务 1：配置 DeepSeek（10 分钟）

#### 更新 .env

```bash
cd ~/projects/p1-monitor/backend

# 在 .env 中添加
DEEPSEEK_API_KEY="sk-your-api-key-here"
```

#### 测试连接

创建 `src/modules/health/health.controller.ts`，添加测试接口：

```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { ConfigService } from '@nestjs/config';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';

@Controller('api/health')
export class HealthController {
  constructor(
    private healthService: HealthService,
    private configService: ConfigService,
  ) 

  @Get()
  async check() {
    return this.healthService.getStatus();
  }

  @Get('ai-test')
  async testAI() {
    const deepseek = createOpenAICompatible({
      name: 'deepseek',
      apiKey: this.configService.get('DEEPSEEK_API_KEY'),
      baseURL: 'https://api.deepseek.com',
    });

    const result = await generateText({
      model: deepseek('deepseek-chat'),
      prompt: '你好，请用一句话介绍自己',
    });

    return { text: result.text };
  }
}
```

**测试**：
```bash
curl http://localhost:3000/api/health/ai-test

# 应该返回：
# {"text":"你好！我是DeepSeek，一个..."}
```

如果报错，检查：
1. API Key 是否正确
2. 是否有余额
3. 网络是否能访问 api.deepseek.com

---

### 任务 2：定义 5 个工业工具（40 分钟）

创建 `src/modules/agent/tools/index.ts`：

```bash
mkdir -p src/modules/agent/tools
```

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { PrismaService } from '../../../prisma/prisma.service';

// 需要 Prisma 实例，所以用工厂函数
export function createTools(prisma: PrismaService) {
  return {
    /**
     * 工具 1：查询服务器健康状态
     */
    getServerHealth: tool({
      description: '查询指定服务器的当前健康状态，包括 CPU、内存、温度等实时指标',
      parameters: z.object({
        serverId: z.string().describe('服务器 ID，格式如 srv-001'),
      }),
      execute: async ({ serverId }) => {
        // 查询最近 4 条指标（cpu/memory/temperature/disk_io）
        const metrics = await prisma.metric.findMany({
          where: { serverId },
          orderBy: { timestamp: 'desc' },
          take: 4,
        });

        if (metrics.length === 0) {
          return { error: `服务器 ${serverId} 不存在或无数据` };
        }

        // 转换为易读格式
        const health: any = { serverId };
        metrics.forEach((m) => {
          health[m.metricType] = {
            value: m.value,
            unit: m.unit,
            timestamp: m.timestamp,
          };
        });

        return health;
      },
    }),

    /**
     * 工具 2：查询指标历史
     */
    getMetricHistory: tool({
      description: '查询指定服务器某个指标的历史趋势数据',
      parameters: z.object({
        serverId: z.string().describe('服务器 ID'),
        metricType: z.string().describe('指标类型：cpu / memory / temperature / disk_io'),
        minutes: z.number().min(1).max(1440).describe('查询最近多少分钟的数据，最多 1440（24小时）'),
      }),
      execute: async ({ serverId, metricType, minutes }) => {
        const since = new Date(Date.now() - minutes * 60 * 1000);

        const metrics = await prisma.metric.findMany({
          where: {
            serverId,
            metricType,
            timestamp: { gte: since },
          },
          orderBy: { timestamp: 'asc' },
        });

        return {
          serverId,
          metricType,
          count: metrics.length,
          data: metrics.map((m) => ({
            value: m.value,
            timestamp: m.timestamp,
          })),
        };
      },
    }),

    /**
     * 工具 3：查询历史相似异常
     */
    queryHistoricalAnomalies: tool({
      description: '查询指定服务器历史上发生过的相似异常，用于参考解决方案',
      parameters: z.object({
        serverId: z.string().describe('服务器 ID'),
        type: z.string().describe('异常类型，如 cpu_spike / temperature_high'),
      }),
      execute: async ({ serverId, type }) => {
        const anomalies = await prisma.anomaly.findMany({
          where: {
            serverId,
            type,
            status: 'resolved', // 只查已解决的
          },
          orderBy: { detectedAt: 'desc' },
          take: 5,
          include: {
            diagnosis: true, // 包含诊断记录
          },
        });

        return {
          count: anomalies.length,
          cases: anomalies.map((a) => ({
            detectedAt: a.detectedAt,
            resolvedAt: a.resolvedAt,
            conclusion: a.diagnosis?.conclusion || '无诊断记录',
          })),
        };
      },
    }),

    /**
     * 工具 4：创建工单
     */
    createTicket: tool({
      description: '为设备问题创建运维工单',
      parameters: z.object({
        serverId: z.string().describe('服务器 ID'),
        title: z.string().describe('工单标题'),
        description: z.string().describe('问题描述'),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).describe('优先级'),
      }),
      execute: async ({ serverId, title, description, priority }) => {
        const ticket = await prisma.ticket.create({
          data: {
            serverId,
            title,
            description,
            priority,
            status: 'open',
          },
        });

        return {
          ticketId: ticket.id,
          message: '工单已创建',
        };
      },
    }),

    /**
     * 工具 5：列出最近异常
     */
    listRecentAnomalies: tool({
      description: '列出最近一段时间内的异常列表',
      parameters: z.object({
        hours: z.number().min(1).max(168).describe('查询最近多少小时，最多 168（7天）'),
        severity: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('可选：按严重度筛选'),
      }),
      execute: async ({ hours, severity }) => {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);

        const anomalies = await prisma.anomaly.findMany({
          where: {
            detectedAt: { gte: since },
            ...(severity && { severity }),
          },
          orderBy: { detectedAt: 'desc' },
          include: { server: true },
        });

        return {
          count: anomalies.length,
          anomalies: anomalies.map((a) => ({
            id: a.id,
            serverId: a.serverId,
            serverName: a.server.name,
            type: a.type,
            severity: a.severity,
            status: a.status,
            detectedAt: a.detectedAt,
          })),
        };
      },
    }),
  };
}
```

#### 理解工具设计（用 Claude Code）

问 Claude Code：
```
1. 为什么 parameters 用 Zod schema？
2. describe() 有什么作用？
3. 如果工具执行失败，应该返回什么格式？
```

---

### 任务 3：创建 AgentModule（30 分钟）

```bash
nest g module modules/agent
nest g service modules/agent
nest g controller modules/agent
```

#### 编写 AgentService

修改 `src/modules/agent/agent.service.ts`：

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, CoreMessage } from 'ai';
import { createTools } from './tools';

@Injectable()
export class AgentService {
  private readonly deepseek;
  private readonly tools;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    // 初始化 DeepSeek
    this.deepseek = createOpenAICompatible({
      name: 'deepseek',
      apiKey: this.configService.get('DEEPSEEK_API_KEY')!,
      baseURL: 'https://api.deepseek.com',
    });

    // 初始化工具集
    this.tools = createTools(prisma);
  }

  /**
   * 简单对话（不带工具）
   */
  async chat(messages: CoreMessage[]) {
    const result = await generateText({
      model: this.deepseek('deepseek-chat'),
      messages,
      system: '你是一个工业异常监控智能助手，可以帮助用户查询设备状态、分析异常。',
    });

    return result.text;
  }

  /**
   * 带工具的对话（Tool Calling）
   */
  async chatWithTools(messages: CoreMessage[]) {
    const result = await generateText({
      model: this.deepseek('deepseek-chat'),
      messages,
      system: `你是工业异常监控智能助手。你可以调用工具查询设备状态、历史数据、异常记录。

调用工具的时机：
- 用户问设备状态时，调用 getServerHealth
- 用户问历史趋势时，调用 getMetricHistory
- 用户问异常列表时，调用 listRecentAnomalies
- 发现严重问题时，调用 createTicket

返回格式：
- 用 Markdown 格式
- 数据用表格展示
- 重要信息加粗`,
      tools: this.tools,
      maxSteps: 5, // 最多 5 步（重要！防止无限循环）
    });

    return {
      text: result.text,
      steps: result.steps, // 工具调用记录
    };
  }
}
```

#### 编写 AgentController

修改 `src/modules/agent/agent.controller.ts`：

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { AgentService } from './agent.service';

@Controller('api/agent')
export class AgentController {
  constructor(private agentService: AgentService) {}

  @Post('chat')
  async chat(@Body() body: { message: string }) {
    const result = await this.agentService.chatWithTools([
      { role: 'user', content: body.message },
    ]);

    return result;
  }
}
```

---

### 任务 4：测试 Tool Calling（10 分钟）

```bash
# 测试 1：查询服务器状态
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "srv-001 的 CPU 现在怎么样？"}'

# 应该返回：
# {
#   "text": "srv-001 的 CPU 当前为 45.2%，状态正常...",
#   "steps": [
#     { "type": "tool-call", "toolName": "getServerHealth", ... },
#     { "type": "tool-result", ... }
#   ]
# }

# 测试 2：查询历史
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "srv-001 过去 30 分钟的 CPU 趋势"}'

# 测试 3：查询异常
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "过去 1 小时有哪些异常？"}'
```

#### 观察 steps 数组

重点看 `steps` 字段，应该包含：
```json
[
  {
    "type": "tool-call",
    "toolName": "getServerHealth",
    "args": { "serverId": "srv-001" }
  },
  {
    "type": "tool-result",
    "result": { "serverId": "srv-001", "cpu": { "value": 45.2, ... } }
  }
]
```

这就是 Tool Calling 的核心：LLM 决定调用哪个工具，传什么参数。

---

## ✅ 验收清单

- [ ] DeepSeek API 连接成功（/api/health/ai-test 返回正常）
- [ ] 5 个工具全部定义完成
- [ ] `curl .../agent/chat` 能正确调用工具
- [ ] Agent 能识别用户意图并选择正确的工具
- [ ] steps 数组包含完整的工具调用记录
- [ ] git commit 已提交

## 🤔 思考题

1. **LLM 怎么知道要调用哪个工具？**
   - 提示：看 description 和 parameters.describe()

2. **如果工具执行失败（如服务器不存在），LLM 会怎样？**
   - 实际测试：问一个不存在的服务器

3. **maxSteps: 5 的作用是什么？**
   - 如果不设置会怎样？

## 💡 常见问题

### Q: Tool Calling 失败，LLM 总是不调用工具？

A: 检查：
1. description 是否清晰
2. parameters.describe() 是否写了
3. 用户问题是否明确（"查询 srv-001" 比 "看看设备" 清晰）

### Q: DeepSeek API 报错 401？

A: API Key 错误或余额不足，重新检查 .env

### Q: 工具调用了，但返回 error？

A: 检查数据库是否有数据（运行 Day 3 的定时任务）

## 📝 今日总结

**学到了什么**：
- Vercel AI SDK 基础用法
- Tool Calling 核心概念
- Zod schema 参数定义
- DeepSeek API 集成

**明天预告**：
- Day 6：Multi-step Agent（最重要的一天）
- Agent 自主多步推理
- 监听 anomaly.detected 事件自动诊断

---

**Day 5 完成！明天是 Week 1 最重要的一天 🚀**
