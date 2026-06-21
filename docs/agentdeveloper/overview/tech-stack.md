# 技术栈详解

## 📋 总览

这份文档详细解释 60 天计划中涉及的所有技术栈，包括选型理由、学习曲线、替代方案。

## 🏗 技术栈全景图

```
前端层
├── 框架：Vue 3 + TypeScript
├── 状态管理：Pinia
├── UI 组件：Element Plus
├── 图表：Echarts
├── 3D：Three.js + @react-three/fiber
└── 实时通信：socket.io-client

后端层
├── 框架：NestJS + TypeScript
├── 数据库：Postgres + pgvector
├── ORM：Prisma
├── 定时任务：@nestjs/schedule
├── 事件驱动：@nestjs/event-emitter
└── 实时通信：@nestjs/websockets

AI 层
├── LLM：DeepSeek（主模型）
├── Agent 框架：Vercel AI SDK
├── RAG 框架：LangChain.js
├── 编排框架：LangGraph.js
└── Embedding：OpenAI text-embedding-3

工程化
├── 容器化：Docker + docker-compose
├── CI/CD：GitHub Actions
├── 监控：Sentry + PostHog
├── 测试：Jest + Vitest
└── 部署：Vercel + Railway
```

---

## 🎨 前端技术栈

### Vue 3 + TypeScript

**选型理由**：
- 你已有 6 年 Vue 经验，学习成本最低
- TypeScript 类型安全，适合大型项目
- Composition API 与 React Hooks 思维相通

**学习重点**：
```typescript
// Composition API
import { ref, computed, watch, onMounted } from 'vue';

export default {
  setup() {
    const count = ref(0);
    const double = computed(() => count.value * 2);
    
    watch(count, (newVal) => {
      console.log('count changed:', newVal);
    });
    
    onMounted(() => {
      console.log('component mounted');
    });
    
    return { count, double };
  }
};
```

**替代方案**：
- React 18：如果你想学 React 生态
- Svelte：轻量级，但生态较小

---

### Pinia（状态管理）

**选型理由**：
- Vue 3 官方推荐（替代 Vuex）
- API 简洁，TypeScript 友好
- 支持组合式 API 风格

**核心概念**：
```typescript
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', () => {
  const user = ref(null);
  
  function login(username, password) {
    // ...
  }
  
  return { user, login };
});
```

**替代方案**：
- Vuex 4：如果你习惯 Vuex
- Zustand：React 风格的状态管理

---

### Echarts（图表库）

**选型理由**：
- 国产开源，中文文档友好
- 功能强大，支持实时数据更新
- 性能优秀，支持大数据量

**学习重点**：
- 配置项结构（option）
- 实时数据更新（setOption）
- 性能优化（dataZoom / sampling）

**替代方案**：
- Chart.js：轻量级，但功能较少
- D3.js：灵活度高，但学习曲线陡

---

### Three.js（3D 引擎）

**选型理由**：
- 最成熟的 Web 3D 库
- 社区活跃，资源丰富
- 你的 6 年前端经验可直接迁移

**核心概念**：
```typescript
// 场景、相机、渲染器
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

// 几何体 + 材质 = 网格
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// 渲染循环
function animate() {
  requestAnimationFrame(animate);
  cube.rotation.x += 0.01;
  renderer.render(scene, camera);
}
```

**学习路径**：
1. Day 46-48：Three.js 基础（场景/相机/光照）
2. Day 49-51：交互（射线检测/相机控制）
3. Day 52-54：优化（InstancedMesh / LOD）

**替代方案**：
- Babylon.js：更适合游戏
- Unity WebGL：性能最强，但体积大

---

## 🔧 后端技术栈

### NestJS

**选型理由**：
- TypeScript 原生，前后端统一语言
- 模块化架构，适合学习后端思维
- 装饰器语法，类似 Vue 的 @Component
- 国内大厂（字节、阿里）在用

**核心概念**：
```
Module（模块）
  ├── Controller（控制器）：处理路由
  ├── Service（服务）：业务逻辑
  ├── Repository（仓储）：数据访问
  └── DTO（数据传输对象）：参数校验
```

**学习重点**：
- 依赖注入（DI / IoC）
- 装饰器（@Module / @Injectable / @Controller）
- Guards / Interceptors / Pipes / Filters
- WebSocket Gateway

**替代方案**：
- Express + TypeScript：更轻量，但缺少架构
- Fastify：性能最强，但生态较小
- Koa：中间件模式，但需要自己搭架构

**为什么不选 Python（FastAPI）**：
- Day 1-365 聚焦 TypeScript，统一技术栈
- Day 366-540 再补 Python

---

### Postgres + pgvector

**选型理由**：
- 成熟稳定，企业级数据库
- pgvector 扩展支持向量检索（P2 RAG 必需）
- JSON 类型支持（存储灵活数据）
- 免费，Supabase 提供托管服务

**核心概念**：
```sql
-- 创建向量扩展
CREATE EXTENSION vector;

-- 向量列
ALTER TABLE documents ADD COLUMN embedding vector(1536);

-- 向量检索
SELECT * FROM documents
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;
```

**替代方案**：
- MySQL：不支持 pgvector
- MongoDB：NoSQL，不适合关系数据
- 专用向量库（Pinecone / Milvus）：成本高

---

### Prisma ORM

**选型理由**：
- TypeScript 原生，类型安全
- Migration 自动管理
- Prisma Studio 可视化工具
- 查询 API 简洁直观

**核心概念**：
```prisma
// schema.prisma
model User {
  id    String @id @default(uuid())
  email String @unique
  posts Post[]
}

model Post {
  id       String @id @default(uuid())
  title    String
  authorId String
  author   User   @relation(fields: [authorId], references: [id])
}
```

```typescript
// 查询
const user = await prisma.user.findUnique({
  where: { id: '...' },
  include: { posts: true },
});
```

**替代方案**：
- TypeORM：更像传统 ORM，但类型推断较弱
- Drizzle：性能最强，但生态较新

---

## 🤖 AI 技术栈

### DeepSeek（LLM）

**选型理由**：
- 性价比极高（$0.27/M tokens，GPT-4 的 1/100）
- 中文能力强
- Tool Calling 稳定
- API 兼容 OpenAI

**定价对比**：
| 模型 | Input | Output | 1M tokens 成本 |
|------|-------|--------|---------------|
| GPT-4 Turbo | $10/M | $30/M | ~$40 |
| Claude 3 Opus | $15/M | $75/M | ~$90 |
| **DeepSeek** | $0.14/M | $0.28/M | **$0.42** |

**替代方案**：
- GPT-4 Turbo：准确率最高，但贵
- Claude 3 Opus：长上下文（200K），但贵
- Llama 3（本地）：免费，但需要 GPU

---

### Vercel AI SDK

**选型理由**：
- TypeScript 原生
- API 简洁（generateText / streamText）
- Tool Calling 支持好
- 与 NestJS 集成方便

**核心 API**：
```typescript
import { generateText, tool } from 'ai';
import { z } from 'zod';

const result = await generateText({
  model: deepseek('deepseek-chat'),
  messages: [{ role: 'user', content: '你好' }],
  tools: {
    getWeather: tool({
      description: '查询天气',
      parameters: z.object({
        city: z.string(),
      }),
      execute: async ({ city }) => {
        return { temperature: 25 };
      },
    }),
  },
  maxSteps: 5,
});
```

**替代方案**：
- LangChain.js：功能更多，但 API 复杂
- 直接调用 OpenAI SDK：没有 Tool Calling 封装

---

### LangChain.js（RAG）

**选型理由**：
- RAG 标准框架
- 文档加载器丰富
- 向量存储集成方便
- 链式调用灵活

**核心组件**：
```
Document Loaders → Text Splitters → Embeddings → Vector Store → Retriever → Chain
```

**使用场景**：
- P2 项目：RAG 完整链路
- P3 项目：知识库检索

**替代方案**：
- 自己实现 RAG：灵活，但轮子重
- LlamaIndex（Python）：功能强，但 JS 版不成熟

---

### LangGraph.js（Agent 编排）

**选型理由**：
- Multi-Agent 编排标准框架
- StateGraph 状态机设计清晰
- 支持 Human-in-the-loop
- LangSmith 集成

**核心概念**：
```typescript
import { StateGraph } from '@langchain/langgraph';

const workflow = new StateGraph({
  channels: { state: null },
});

workflow.addNode('step1', async (state) => {
  return { ...state, step1Done: true };
});

workflow.addNode('step2', async (state) => {
  return { ...state, step2Done: true };
});

workflow.addEdge('step1', 'step2');
workflow.setEntryPoint('step1');

const app = workflow.compile();
const result = await app.invoke({ input: 'hello' });
```

**使用场景**：
- P3 项目：4 个 Agent 协作编排

**替代方案**：
- AutoGPT（Python）：功能强，但 JS 版不存在
- 自己实现状态机：灵活，但复杂

---

## 🛠 工程化技术栈

### Docker

**选型理由**：
- 环境一致性（开发 = 生产）
- 部署简单（一键启动）
- 隔离性好（容器互不干扰）

**学习重点**：
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["node", "dist/main"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: 123456
  backend:
    build: ./backend
    depends_on:
      - postgres
```

---

### Sentry（错误监控）

**选型理由**：
- 免费额度足够（5000 错误/月）
- 前后端都支持
- Source Map 反混淆
- 错误聚合与分组

**集成**：
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

---

### PostHog（产品分析）

**选型理由**：
- 开源，可自托管
- 功能全面（用户行为 / 漏斗 / 留存）
- 免费额度足够

**集成**：
```typescript
import posthog from 'posthog-js';

posthog.init(process.env.POSTHOG_KEY);
posthog.capture('user_signed_up');
```

---

## 📊 技术栈学习时间分配

```
Week 1-2 (P1): NestJS + Prisma + WebSocket + Vercel AI SDK
Week 3-4 (P2): LangChain.js + pgvector + RAG
Week 5-6 (P3): LangGraph.js + Multi-Agent
Week 7-8 (P4): Three.js + 生产级工程化
```

---

## 🎯 技术选型原则

1. **统一语言**：前后端都用 TypeScript
2. **成熟稳定**：选主流技术栈，避免踩坑
3. **学习曲线**：优先选你已有基础的（Vue）
4. **生态完善**：文档 / 社区 / 工具链
5. **成本可控**：优先免费 / 开源方案

---

## 📚 学习资源

### 官方文档
- NestJS：https://docs.nestjs.cn
- Prisma：https://prisma.org.cn
- LangChain.js：https://js.langchain.com
- Three.js：https://threejs.org

### 推荐教程
- NestJS：B站「技术胖 NestJS 教程」
- Three.js：「Three.js Journey」（$95，值得）
- LangChain.js：官方 Cookbook

### 社区
- Discord：NestJS / LangChain / Three.js 官方群
- Reddit：r/typescript / r/nestjs
- V2EX：Node.js 节点

---

**这份技术栈让你在 60 天内快速成长！**
