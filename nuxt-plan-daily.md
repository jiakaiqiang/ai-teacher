# 🎓 Nuxt 全栈 + AI 10周学习计划（每日明细）

> 技术栈已从 Next.js 调整为 **Nuxt 4（Vue 3）**。
> 你有 5 年 Vue 经验，Nuxt 是 Vue 生态的全栈元框架：
> - 页面/路由：`app/pages/` 文件路由
> - 服务端：`server/api/` 用 Nitro（H3）写后端接口
> - SSR/SEO：开箱即用
> - 部署：Vercel / Node / 静态均可

---

## 📁 项目结构（lighthouse-ai-nuxt）

```
lighthouse-ai-nuxt/
├── app/
│   ├── app.vue              # 根组件（含 <NuxtPage/>）
│   ├── pages/               # 文件路由
│   │   └── index.vue        # 首页 ✅ Day1完成
│   ├── components/          # Vue 组件
│   ├── composables/         # 组合式函数（useXxx）
│   └── assets/css/main.css  # Tailwind 入口
├── server/
│   └── api/                 # 后端接口（Nitro）
├── nuxt.config.ts           # 配置
└── package.json
```

---

## 每天怎么学（统一节奏）

每天分 4 块，AI导师早上下发、晚上检查：

1. **📚 学（概念）** — 看文档/视频，知道"是什么、为什么"
2. **💻 做（编码）** — 在项目里写代码，"怎么用"
3. **✅ 验（验证）** — 跑起来 / 写测试 / curl 接口，确认"真的对"
4. **📝 记（复盘）** — 记录遇到的问题和收获，提交 git

---

## Phase 1：Nuxt + AI 基础（Day 1-21）

### Week 1：Nuxt 基础 + 首个 AI 接口

#### ✅ Day 1 — Nuxt 项目搭建（已完成）
- **学**：Nuxt 4 目录结构、`app/pages` 文件路由、`<NuxtPage>`
- **做**：创建项目、写首页 `index.vue`（Hero + 特性 + 数据）
- **验**：`npm run dev` → http://localhost:3000 正常渲染
- **记**：git commit "Day1: Nuxt 项目搭建 + 首页"

#### Day 2 — Vue 3 组合式 API + 组件拆分
- **学**：`<script setup>`、`ref`/`reactive`/`computed`、props/emit
- **做**：把首页拆成 `<FeatureCard>`、`<StatItem>` 组件，用 props 传数据
- **验**：组件复用正常，页面效果不变；TypeScript 无报错
- **记**：理解组合式 API 与 React Hooks 的差异
- **时间**：3-4h

#### Day 3 — Nuxt server API（第一个后端接口）
- **学**：`server/api/` 目录、`defineEventHandler`、`readBody`、Nitro
- **做**：写 `server/api/hello.get.ts` 和 `server/api/echo.post.ts`
- **验**：`curl localhost:3000/api/hello`、`useFetch('/api/hello')` 前端能拿到
- **记**：Nuxt 的"全栈"是怎么一回事（前后端同一项目）
- **时间**：4h
- **示例**：
  ```ts
  // server/api/hello.get.ts
  export default defineEventHandler(() => {
    return { message: 'Hello from Nitro', time: Date.now() }
  })
  ```

#### Day 4 — 调用大模型 API（第一个 AI 接口）
- **学**：OpenAI/通义/Kimi 的 chat completions API、环境变量 `runtimeConfig`
- **做**：`server/api/chat.post.ts` 接收 message，调用大模型返回回复
- **验**：`curl -X POST localhost:3000/api/chat -d '{"message":"你好"}'` 有 AI 回复
- **记**：API key 放 `.env`，绝不提交到 git
- **时间**：5h
- **示例**：
  ```ts
  // server/api/chat.post.ts
  export default defineEventHandler(async (event) => {
    const { message } = await readBody(event)
    const config = useRuntimeConfig()
    const res = await $fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.openaiKey}` },
      body: {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: message }],
      },
    })
    return { reply: res.choices[0].message.content }
  })
  ```

#### Day 5 — 前端对话界面 + useFetch
- **学**：`useFetch`/`$fetch`、`v-model`、列表渲染、加载态
- **做**：做一个聊天框页面 `pages/chat.vue`，输入→调 `/api/chat`→展示回复
- **验**：能连续对话、有 loading、报错有提示
- **记**：Nuxt 数据请求的几种方式区别
- **时间**：4h

#### Day 6 — 流式输出（Streaming）
- **学**：SSE / ReadableStream、打字机效果
- **做**：改造 `/api/chat` 为流式，前端逐字显示
- **验**：回复像 ChatGPT 一样逐字出现
- **记**：流式对体验的提升、实现难点
- **时间**：5h

#### Day 7 — Week 1 小结 + Lighthouse 接入起步
- **学**：`lighthouse` npm 包、性能指标含义（FCP/LCP/CLS/TTI）
- **做**：`server/api/analyze.post.ts` 接收 url，跑 Lighthouse 返回分数
- **验**：传入一个网址能返回真实性能数据
- **记**：本周复盘（学会了什么、卡在哪）
- **时间**：5h

---

### Week 2：lighthouse-ai-analyzer 核心功能（Day 8-14）

- **Day 8**：分析结果数据可视化（图表组件，雷达图/条形图）
- **Day 9**：AI 解读性能报告（把 Lighthouse 数据喂给 AI，生成优化建议）
- **Day 10**：完整流程串联（输入url→分析→AI建议→展示）+ 部署到 Vercel
- **Day 11**：错误处理、loading、超时、边界情况
- **Day 12**：UI 打磨 + 响应式 + 暗色模式
- **Day 13**：写 README + 录演示 + 开源推广
- **Day 14**：Week 2 复盘 + 代码重构

### Week 3：作品输出（Day 15-21）
- **Day 15-17**：技术文章《用 Nuxt + AI 做性能分析工具》
- **Day 18-20**：个人作品集网站（Nuxt 静态生成）
- **Day 21**：Phase 1 总结，技能盘点

---

## Phase 2：全栈能力补强（Day 22-35）

> 重点：数据库设计、后端架构、缓存、性能优化（你指定要加强的）

### Week 4：后端硬实力（Day 22-28）
- **Day 22**：PostgreSQL + Prisma，数据库设计三范式、索引
- **Day 23**：Redis 缓存（缓存策略 + 防穿透/雪崩/击穿）
- **Day 24**：用户认证（Nuxt 用 `nuxt-auth-utils` 或自建 JWT + H3）
- **Day 25**：后端分层架构（Repository / Service / API 三层）
- **Day 26**：性能优化（N+1、索引、分页、gzip、ETag、连接池）
- **Day 27**：可观测性（结构化日志、请求追踪、健康检查）
- **Day 28**：Week 4 总结 + 给 lighthouse 工具加数据库和缓存

> ⚠️ 认证方案变化：Nuxt 不用 NextAuth，改用
> - `nuxt-auth-utils`（官方推荐，轻量）或
> - `@sidebase/nuxt-auth`（功能全）
> JWT、bcrypt、Prisma 这些后端知识完全通用，不浪费。

### Week 5：全栈项目实战（Day 29-35）
- AI 智能笔记应用（Nuxt 全栈）：富文本编辑、AI 续写/改写/总结、全文搜索、多人协作

---

## Phase 3：AI Agent 开发（Day 36-56）

> LangChain.js 是框架无关的，Nuxt 里照样用。Agent/RAG 知识 100% 通用。

- **Week 6**：LangChain.js + Agent 基础 + LangSmith 监控 + Function Calling
- **Week 7**：RAG 应用（向量数据库 + Embedding + Hybrid Search + Re-ranking）
- **Week 8**：Multi-Agent 系统（LangGraph 工作流编排）

---

## Phase 4：高级 AI 应用（Day 57-70）

- **Week 9**：Prompt Engineering 深度 + 成本优化 + 可观测性
- **Week 10**：综合项目实战 + 部署 + 10周总结

---

## 🎯 Nuxt vs Next.js 对照（旧计划里的概念怎么映射）

| 旧计划（Next.js） | 新计划（Nuxt） |
|------------------|---------------|
| `app/page.tsx` | `app/pages/index.vue` |
| `app/api/x/route.ts` | `server/api/x.post.ts` |
| React Hooks (useState) | Vue 组合式 (ref/reactive) |
| NextAuth.js | nuxt-auth-utils / @sidebase/nuxt-auth |
| `'use client'` | Nuxt 默认同构，无需标记 |
| Vercel AI SDK (React) | Vercel AI SDK Vue 版 / 直接 fetch 流式 |

**完全通用、不受影响的**：数据库、Redis、Prisma、LangChain、RAG、向量数据库、Agent、Prompt Engineering、性能优化、可观测性 —— 这些占了整个计划的 70%。

---

**Day 1 已完成（Nuxt 版）。明天 09:04 飞书推送 Day 2 任务。**
