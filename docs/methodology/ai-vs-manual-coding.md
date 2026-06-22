# AI Vibe Coding 学习方法论：AI 生成 vs 手写代码分类规则

## 📌 核心原则：3:7 黄金法则

```
AI 辅助（30%）：脚手架、配置、样板代码
手写核心（70%）：业务逻辑、算法、关键概念
```

**目标**：通过手写核心代码深度学习，而非复制粘贴 AI 生成的代码。

---

## ✅ AI 可以生成的内容（30%）

### 1. 项目脚手架与配置文件

**允许 AI 生成**：
- `package.json` - 依赖配置
- `tsconfig.json` - TypeScript 配置
- `.env.example` - 环境变量模板
- `docker-compose.yml` - Docker 编排
- `.gitignore` - Git 忽略规则
- `README.md` - 项目说明文档
- `Dockerfile` - 容器配置

**原因**：这些是标准化配置，无需深度理解，复制即可。

**验证方式**：
```bash
□ 文件存在且格式正确
□ 能成功运行 npm install / docker-compose up
```

---

### 2. 样板代码（Boilerplate）

**允许 AI 生成**：
- DTO 类型定义（`create-server.dto.ts`）
- 数据库 Schema（`schema.prisma` 表结构）
- Swagger 装饰器（`@ApiProperty`）
- 测试样板（`describe/it` 框架）
- 环境变量类型（`env.d.ts`）

**示例**：
```typescript
// ✅ AI 可生成：DTO 定义
export class CreateServerDto {
  @ApiProperty()
  @IsString()
  hostname: string;

  @ApiProperty()
  @IsNumber()
  cpuCores: number;
}
```

**原因**：这是重复性工作，学习价值低。

**验证方式**：
```bash
□ 类型定义完整
□ 装饰器语法正确
□ 能通过 TypeScript 编译
```

---

### 3. 基础 CRUD 代码

**允许 AI 生成**：
- Prisma Client 基础查询（`findMany/create/update/delete`）
- RESTful API 基础路由
- 简单的增删改查 Service 方法

**示例**：
```typescript
// ✅ AI 可生成：基础 CRUD
async findAll() {
  return this.prisma.server.findMany();
}

async create(dto: CreateServerDto) {
  return this.prisma.server.create({ data: dto });
}
```

**原因**：标准 CRUD 无技术含量。

**验证方式**：
```bash
□ API 能正常响应
□ 数据能正确写入数据库
```

---

### 4. 类型声明与接口定义

**允许 AI 生成**：
- 基础类型（`type Server = { ... }`）
- 接口定义（`interface IServerService`）
- Enum 枚举（`enum ServerStatus`）

**示例**：
```typescript
// ✅ AI 可生成：类型定义
export interface Server {
  id: string;
  hostname: string;
  status: ServerStatus;
  createdAt: Date;
}

export enum ServerStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  ERROR = 'error',
}
```

**原因**：类型定义是描述性的，不是逻辑性的。

---

## ❌ 必须手写的内容（70%）

### 1. NestJS 架构代码（核心学习目标）

**必须手写**：
- Module 定义（`@Module` 装饰器配置）
- Controller 定义（`@Controller` 路由逻辑）
- Service 定义（依赖注入、业务逻辑）
- Provider 配置（依赖注入关系）
- Middleware / Guard / Interceptor（核心概念）

**示例**：
```typescript
// ❌ 禁止 AI 生成：你必须手写理解
@Module({
  imports: [PrismaModule],  // 理解：依赖关系
  controllers: [ServerController],  // 理解：路由层
  providers: [ServerService],  // 理解：业务层
  exports: [ServerService],  // 理解：模块导出
})
export class ServerModule {}
```

**学习目标**：
- 深度理解 NestJS 依赖注入
- 理解模块化架构
- 掌握分层设计

**验证方式**：
```bash
□ 能解释为什么这样组织
□ 能说出每个装饰器的作用
□ 能画出模块依赖图
```

---

### 2. Vercel AI SDK Tool Calling（核心能力）

**必须手写**：
- Tool 定义（`tool({ description, parameters, execute })`）
- Schema 定义（`z.object({ ... })`）
- Tool 执行逻辑
- 工具组合与编排

**示例**：
```typescript
// ❌ 禁止 AI 生成：核心 Agent 能力
const getServerMetrics = tool({
  description: '获取服务器实时指标',
  parameters: z.object({
    serverId: z.string().describe('服务器 ID'),
    metrics: z.array(z.enum(['cpu', 'memory', 'disk'])),
  }),
  execute: async ({ serverId, metrics }) => {
    // 你必须自己实现这部分逻辑
    const data = await fetchMetrics(serverId, metrics);
    return formatForLLM(data);
  },
});
```

**学习目标**：
- 理解 Function Calling 原理
- 掌握 Schema 设计
- 学会设计 AI 工具

**验证方式**：
```bash
□ 能解释 Tool Calling 工作流程
□ 能独立设计 5 个工具
□ 能调试工具调用失败
```

---

### 3. LangChain.js RAG 核心逻辑

**必须手写**：
- 文档分割策略（`RecursiveCharacterTextSplitter`）
- Embedding 生成与存储
- 向量检索逻辑（`vectorStore.similaritySearch`）
- Reranker 实现
- Hybrid Search 组合

**示例**：
```typescript
// ❌ 禁止 AI 生成：RAG 核心
async function hybridSearch(query: string) {
  // 1. 向量检索（你必须理解原理）
  const vectorResults = await vectorStore.similaritySearch(query, 10);
  
  // 2. 全文检索（你必须理解原理）
  const ftsResults = await prisma.$queryRaw`
    SELECT * FROM documents
    WHERE to_tsvector('chinese', content) @@ plainto_tsquery('chinese', ${query})
  `;
  
  // 3. Rerank（你必须理解融合策略）
  const merged = rerank(vectorResults, ftsResults);
  
  return merged.slice(0, 5);
}
```

**学习目标**：
- 理解 Embedding 原理
- 掌握向量检索
- 学会混合检索

**验证方式**：
```bash
□ 能解释 Embedding 如何工作
□ 能调整检索参数提升召回率
□ 能实现自定义 Reranker
```

---

### 4. LangGraph.js 状态机编排

**必须手写**：
- StateGraph 定义
- Node 逻辑（每个 Agent 的行为）
- Edge 条件判断（路由逻辑）
- Human-in-the-loop 实现

**示例**：
```typescript
// ❌ 禁止 AI 生成：Multi-Agent 核心
const workflow = new StateGraph({
  channels: {
    anomaly: { value: null },
    diagnosis: { value: null },
    repairPlan: { value: null },
    verified: { value: false },
  },
});

// 你必须手写每个 Node
workflow.addNode('monitor', async (state) => {
  // 检测异常逻辑
});

workflow.addNode('diagnose', async (state) => {
  // 诊断逻辑
});

// 你必须手写条件路由
workflow.addConditionalEdges('diagnose', (state) => {
  if (state.diagnosis.severity === 'critical') {
    return 'human_review';  // 需要人工介入
  }
  return 'repair';
});
```

**学习目标**：
- 理解状态机原理
- 掌握 Agent 编排
- 学会条件路由

**验证方式**：
```bash
□ 能画出完整的状态转移图
□ 能解释每个节点的职责
□ 能调试 Agent 卡住的问题
```

---

### 5. 业务逻辑算法

**必须手写**：
- 异常检测算法（Z-Score / 移动平均）
- 数据聚合逻辑
- 复杂查询（多表 JOIN + 聚合）
- 缓存策略
- 重试机制

**示例**：
```typescript
// ❌ 禁止 AI 生成：算法逻辑
function detectAnomaly(metrics: Metric[]) {
  // Z-Score 异常检测（你必须理解统计原理）
  const mean = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
  const std = Math.sqrt(
    metrics.reduce((sum, m) => sum + Math.pow(m.value - mean, 2), 0) / metrics.length
  );
  
  return metrics.filter((m) => {
    const zScore = Math.abs((m.value - mean) / std);
    return zScore > 3;  // 3σ 原则
  });
}
```

**学习目标**：
- 理解算法原理
- 能优化性能
- 能调整参数

**验证方式**：
```bash
□ 能解释算法工作原理
□ 能用伪代码描述逻辑
□ 能分析时间复杂度
```

---

### 6. Prompt Engineering

**必须手写**：
- System Prompt 设计
- Few-shot 示例
- 输出格式控制
- 多轮对话上下文管理

**示例**：
```typescript
// ❌ 禁止 AI 生成：Prompt 是核心能力
const systemPrompt = `
你是一个资深运维专家，擅长诊断服务器异常。

## 你的职责
1. 分析异常指标数据
2. 给出根因分析
3. 推荐修复方案

## 输出格式（严格遵守）
{
  "rootCause": "根本原因",
  "severity": "low | medium | high | critical",
  "recommendation": "具体修复建议"
}

## 示例
输入：CPU 100% 持续 5 分钟
输出：{"rootCause": "进程 node 占用 CPU 过高", "severity": "high", ...}
`;
```

**学习目标**：
- 掌握 Prompt 设计
- 理解如何控制输出
- 学会迭代优化

**验证方式**：
```bash
□ 能解释为什么这样设计
□ 能优化 Prompt 提升准确率
□ 能处理 LLM 输出格式错误
```

---

### 7. 调试与错误处理

**必须手写**：
- Try-Catch 错误处理
- 日志记录（`console.log` / `winston`）
- 错误重试机制
- 断点调试分析

**示例**：
```typescript
// ❌ 禁止 AI 生成：调试是核心能力
async function callLLMWithRetry(prompt: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await generateText({ model, prompt });
      return result;
    } catch (error) {
      console.error(`[Attempt ${i + 1}] LLM call failed:`, error);
      
      if (error.message.includes('rate_limit')) {
        await sleep(2000 * (i + 1));  // 指数退避
        continue;
      }
      
      throw error;  // 非速率限制错误直接抛出
    }
  }
  
  throw new Error('LLM call failed after retries');
}
```

**学习目标**：
- 学会调试技巧
- 理解错误处理
- 掌握重试策略

---

## 🎯 学习流程：4 步法

### Step 1：AI 生成脚手架（10%）
```bash
提示词："创建 NestJS 项目脚手架，包含 Prisma + Postgres + Docker"
AI 生成：package.json, tsconfig.json, docker-compose.yml
你做：直接使用，无需深度理解
```

### Step 2：阅读学习材料（20%）
```bash
阅读：NestJS 官方文档 - Module/Controller/Service
理解：依赖注入原理
目标：能用自己的话解释核心概念
```

### Step 3：手写核心代码（60%）
```bash
任务：实现 ServerModule + ServerService + Tool Calling
要求：完全手写，禁止复制 AI 代码
验证：能独立实现，能解释每一行
```

### Step 4：验证与测试（10%）
```bash
测试：npm run test
调试：解决报错，理解错误原因
总结：写下学习心得
```

---

## 📊 量化验收标准

### 每个知识点的掌握标准

| 层级 | 标准 | 验证方式 |
|------|------|---------|
| ⭐ 了解 | 知道是什么 | 能说出定义 |
| ⭐⭐ 理解 | 知道为什么 | 能解释原理 |
| ⭐⭐⭐ 应用 | 能独立实现 | 能手写代码 |
| ⭐⭐⭐⭐ 分析 | 能优化调试 | 能解决问题 |
| ⭐⭐⭐⭐⭐ 创造 | 能设计架构 | 能举一反三 |

**每个核心概念必须达到 ⭐⭐⭐⭐ 才算掌握！**

---

## 🚫 AI 辅助的边界

### 什么时候可以问 AI

✅ **允许**：
- "NestJS 的 Module 装饰器有哪些参数？"（查询 API）
- "Prisma 如何做多表 JOIN？"（查询语法）
- "这个报错是什么意思？"（错误诊断）

❌ **禁止**：
- "帮我写一个完整的 ServerService"（核心逻辑）
- "帮我实现 RAG 检索功能"（核心能力）
- "帮我写 LangGraph 状态机"（核心编排）

### 正确的 AI 使用方式

```
错误示例：
  "帮我写一个异常检测的 Agent"
  → AI 生成 500 行代码 → 你复制粘贴 → 没学到任何东西

正确示例：
  "Z-Score 异常检测算法的公式是什么？"
  → AI 给公式 → 你理解公式 → 你手写实现 → 你调试优化
```

---

## 📝 每日验收清单

### 工作日（每晚 2 小时）

```
□ 今天的任务我完全手写了吗？
□ 每一行代码我都理解了吗？
□ 核心概念我能用自己的话解释吗？
□ 遇到的问题我独立解决了吗？
□ 我写了调试日志帮助理解吗？
□ 我能向别人讲解今天学到的内容吗？
```

**如果有任何一项是 "否"，今天的学习不合格！**

---

## 💡 关键认知

### 1. 复制代码 ≠ 学会编程

```
AI 生成 500 行代码，你复制粘贴：
  - 花费时间：5 分钟
  - 学到的：0%
  - 3 个月后：完全忘记

你手写 500 行代码：
  - 花费时间：2 小时
  - 学到的：100%
  - 3 个月后：能力留存
```

### 2. 理解 > 完成

```
错误目标：今天完成 Day 5 所有任务
正确目标：今天彻底理解 Tool Calling 原理

宁可进度慢一点，也要确保深度理解！
```

### 3. 学习是反人性的

```
人性：想快速完成 → 复制 AI 代码
现实：快速完成 = 没有学习

解决：强制自己手写核心代码，即使很慢
```

---

## 🎯 60 天后的验收

### 如果你真的手写了 70% 的代码

```
✅ 能独立实现一个新的 Agent 功能（不依赖 AI）
✅ 能调试复杂的 LangGraph 状态机问题
✅ 能优化 RAG 检索的召回率
✅ 能向面试官清晰解释每个技术细节
✅ 简历上的项目经验是真实能力
```

### 如果你复制了 AI 的代码

```
❌ 面试官一问就露馅
❌ 入职后无法独立工作
❌ 3 个月后忘记所有内容
❌ 简历造假（项目经验虚假）
❌ 职业生涯受损
```

---

## 🔥 最重要的一句话

**当你想让 AI 帮你写核心代码时，记住：**

```
你在偷的每一个懒，
都会在面试和工作中加倍偿还。

60 天的辛苦手写，
换来的是一辈子的真实能力。
```

**坚持手写核心代码，这是唯一的成功路径！**
