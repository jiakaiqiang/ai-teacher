# AI前端导师 - 能力提升版（10周计划）

## 📋 整体规划

### Phase 1：AI前端基础（Week 1-3）
- Week 1: Next.js + AI集成基础
- Week 2: lighthouse-ai-analyzer完成
- Week 3: 简历+文章+作品集

### Phase 2：全栈能力补强（Week 4-5）⭐ 新增
- Week 4: 后端开发（Node.js + 数据库）
- Week 5: 全栈项目实战

### Phase 3：AI Agent开发（Week 6-8）⭐ 新增
- Week 6: LangChain.js + Agent基础
- Week 7: RAG应用开发
- Week 8: Multi-Agent系统

### Phase 4：高级AI应用（Week 9-10）⭐ 新增
- Week 9: AI应用架构和优化
- Week 10: 综合项目实战

---

## 📊 你的短板 vs 新计划对照

| 短板 | 原计划 | 新计划 |
|------|--------|--------|
| 后端能力薄弱 | ⚠️ 只有简单API | ✅ Week 4-5深度补强 |
| 数据库缺失 | ❌ 没有 | ✅ PostgreSQL + Redis |
| AI只停留在API调用 | ⚠️ 基础集成 | ✅ Agent + RAG + Multi-Agent |
| 缺少复杂项目 | ⚠️ 单一功能项目 | ✅ 全栈AI应用 |
| 架构能力不足 | ⚠️ 未覆盖 | ✅ Week 9系统架构 |

---

## Week 4：后端能力补强（7天）

### Day 22-23：数据库基础

**PostgreSQL（2天）**

**Day 22上午：SQL基础**
- 学习内容：
  - 数据库设计（表结构、关系）
  - CRUD操作
  - JOIN查询
  - 索引和性能优化

**Day 22下午-23：Prisma ORM**
```typescript
// prisma/schema.prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id        String   @id @default(uuid())
  title     String
  content   String
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
}

// API实现
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// 创建用户
app.post('/api/users', async (req, res) => {
  const user = await prisma.user.create({
    data: req.body,
  })
  res.json(user)
})

// 查询用户和文章
app.get('/api/users/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { posts: true },
  })
  res.json(user)
})
```

**实战项目：** 给lighthouse-ai-analyzer加数据库
- 存储分析历史
- 用户系统
- 收藏功能

---

### Day 24：Redis缓存

**学习内容：**
- Redis基础命令
- 缓存策略（Cache Aside、Write Through）
- Session存储
- Rate Limiting

**实战：**
```typescript
import Redis from 'ioredis'
const redis = new Redis()

// 1. 缓存分析结果（避免重复运行Lighthouse）
app.get('/api/analyze/:url', async (req, res) => {
  const cacheKey = `analysis:${req.params.url}`
  
  // 先查缓存
  const cached = await redis.get(cacheKey)
  if (cached) {
    return res.json({ fromCache: true, data: JSON.parse(cached) })
  }
  
  // 没有缓存，执行分析
  const result = await runLighthouse(req.params.url)
  
  // 缓存1小时
  await redis.setex(cacheKey, 3600, JSON.stringify(result))
  
  res.json({ fromCache: false, data: result })
})

// 2. Rate Limiting（防止滥用）
async function rateLimiter(req, res, next) {
  const ip = req.ip
  const key = `ratelimit:${ip}`
  
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.expire(key, 60) // 1分钟过期
  }
  
  if (count > 10) {
    return res.status(429).json({ error: '请求过于频繁' })
  }
  
  next()
}
```

---

### Day 25-26：RESTful API设计

**学习内容：**
- RESTful规范
- 认证和鉴权（JWT）
- 输入验证（Zod）
- 错误处理
- API文档（Swagger）

**实战项目：** 完整的后端API
```typescript
// 1. 认证中间件
import jwt from 'jsonwebtoken'

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    return res.status(401).json({ error: '未授权' })
  }
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload
    next()
  } catch (error) {
    res.status(401).json({ error: 'Token无效' })
  }
}

// 2. 输入验证
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
})

app.post('/api/users', async (req, res) => {
  // 验证输入
  const result = createUserSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ errors: result.error.errors })
  }
  
  // 创建用户
  const user = await prisma.user.create({
    data: result.data,
  })
  
  res.json(user)
})

// 3. 统一错误处理
app.use((err, req, res, next) => {
  console.error(err)
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: '未授权' })
  }
  
  res.status(500).json({ error: '服务器错误' })
})
```

**完成标准：**
- [ ] 实现完整的用户认证系统
- [ ] RESTful API符合规范
- [ ] 有输入验证和错误处理
- [ ] API文档齐全

---

### Day 27-28：全栈整合

**实战：** 给lighthouse-ai-analyzer加完整后端

**功能列表：**
1. 用户系统
   - 注册/登录/登出
   - JWT认证
   - 个人资料管理

2. 分析历史
   - 保存分析结果
   - 查看历史记录
   - 结果对比

3. 收藏和分享
   - 收藏分析结果
   - 生成分享链接
   - 公开/私密设置

4. Rate Limiting
   - 防止滥用
   - 不同用户等级不同限额

**技术栈：**
```
前端：Next.js + TypeScript
后端：Next.js API Routes + Prisma
数据库：PostgreSQL
缓存：Redis
认证：NextAuth.js
```

---

## Week 5：全栈项目实战（7天）

### Day 29-35：从0到1构建AI笔记应用

**项目：AI智能笔记（类似Notion AI）**

**核心功能：**
1. Markdown编辑器
2. AI续写/改写/总结
3. 笔记分类和标签
4. 全文搜索
5. 多人协作（WebSocket）

**技术难点：**
- 实时协作（CRDT或OT算法）
- 富文本编辑器
- AI流式输出
- 全文搜索（Elasticsearch或PostgreSQL FTS）

**Day 29-30：** 基础架构
- 数据库设计（User、Note、Tag）
- 认证系统
- RESTful API

**Day 31-32：** 编辑器和AI功能
- 集成富文本编辑器
- AI续写/改写
- Streaming响应

**Day 33-34：** 高级功能
- 笔记搜索
- 标签系统
- 分享功能

**Day 35：** 部署和优化
- 部署到Vercel
- 性能优化
- SEO优化

**完成标准：**
- [ ] 功能完整可用
- [ ] 有真实用户使用
- [ ] 代码质量高
- [ ] 性能优秀

---

## Week 6-10：AI Agent开发（详见phase2-plan.md）

从Week 6开始，按照Phase 2的计划进行：
- Week 6: LangChain.js + Agent基础
- Week 7: RAG应用开发
- Week 8: Multi-Agent系统
- Week 9: AI应用架构
- Week 10: 综合项目

---

## 🎯 10周后的你

### 硬实力
- ✅ Next.js全栈开发
- ✅ AI Agent开发（LangChain.js）
- ✅ RAG应用架构
- ✅ Multi-Agent系统
- ✅ 数据库设计和优化
- ✅ 后端API开发
- ✅ 系统架构能力

### 项目成果
- ✅ lighthouse-ai-analyzer（AI性能分析）
- ✅ AI智能笔记（全栈项目）
- ✅ AI代码审查Agent
- ✅ AI技术顾问（RAG）
- ✅ AI内容创作平台（Multi-Agent）
- ✅ 综合AI应用（自选）

### 市场定位
- 💼 AI全栈应用开发工程师
- 💼 AI Agent架构师
- 💰 薪资范围：50-80万
- 🚀 稀缺度：⭐⭐⭐⭐⭐

---

## 📊 能力雷达图对比

### 10周前（你现在）
```
Next.js         [░░░░░░░░░░] 0%
TypeScript      [████░░░░░░] 40%
AI集成          [░░░░░░░░░░] 0%
后端开发        [██░░░░░░░░] 20%
数据库          [░░░░░░░░░░] 0%
性能优化        [███████░░░] 70%
工程化          [███████░░░] 75%
```

### 10周后（目标）
```
Next.js         [█████████░] 90%
TypeScript      [████████░░] 85%
AI集成          [████████░░] 85%
后端开发        [███████░░░] 75%
数据库          [███████░░░] 70%
性能优化        [██████████] 95%
工程化          [█████████░] 90%
Agent开发       [████████░░] 80%
RAG应用         [███████░░░] 75%
系统架构        [████████░░] 80%
```

---

## 💡 关键区别

| 维度 | 6周计划 | 10周计划 |
|------|---------|----------|
| 学习时长 | 6周 | 10周 |
| 求职部分 | ✅ Week 5-6 | ❌ 去掉 |
| 后端能力 | ⚠️ 基础 | ✅ 深度 |
| 数据库 | ❌ 无 | ✅ PostgreSQL + Redis |
| AI深度 | ⚠️ API调用 | ✅ Agent + RAG |
| 项目数量 | 1个 | 5-6个 |
| 最终能力 | AI前端工程师 | AI全栈架构师 |
| 市场价值 | 35-50万 | 50-80万 |

---

## 🤔 我的建议

基于你的情况：
- ✅ 5年经验（有基础）
- ✅ 性能优化专长（差异化）
- ✅ 不着急找工作（有时间）
- ✅ 想深度提升（有决心）

**强烈建议走10周计划！**

**理由：**
1. 你的最大短板是**后端和AI深度**
2. 市场最稀缺的是**AI全栈**，不是AI前端
3. 多4周能补齐短板+建立优势
4. ROI更高（50万 vs 80万/年）

---

## 📅 时间线

```
Week 1-3:  AI前端基础 ✅
Week 4-5:  全栈补强 ⭐ 新增
Week 6-8:  AI Agent开发 ⭐ 新增
Week 9-10: 高级AI应用 ⭐ 新增

总计：10周（70天）
结束时间：2026-08-26
```

---

想要我：
1. 把这个10周计划整合进AI导师系统？
2. 更新定时任务和进度追踪？
3. 重新生成dashboard（变成70天）？

还是先完成6周计划，再决定是否继续？
