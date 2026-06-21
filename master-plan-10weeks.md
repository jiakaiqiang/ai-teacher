# 🎓 AI前端导师 - 10周深度提升计划

## 🎯 课程目标
从传统前端工程师升级为**AI全栈架构师**，掌握AI Agent开发、RAG应用、全栈开发能力，成为市场稀缺人才

## 📊 学习路线总览

### Phase 1：AI前端基础（Week 1-3，Day 1-21）
- Week 1: Next.js + AI集成基础
- Week 2: lighthouse-ai-analyzer项目开发
- Week 3: 简历优化 + 技术文章 + 作品集

### Phase 2：全栈能力补强（Week 4-5，Day 22-35）⭐ 新增
- Week 4: 数据库（PostgreSQL + Redis）+ 后端API
- Week 5: 全栈项目实战（AI智能笔记）

### Phase 3：AI Agent开发（Week 6-8，Day 36-56）⭐ 新增
- Week 6: LangChain.js + Agent基础
- Week 7: RAG应用开发
- Week 8: Multi-Agent系统

### Phase 4：高级AI应用（Week 9-10，Day 57-70）⭐ 新增
- Week 9: AI应用架构和性能优化
- Week 10: 综合项目实战

---

## 📅 详细学习计划

## Phase 1：AI前端基础（Day 1-21）

### Week 1：Next.js + AI基础

#### Day 1 - Next.js快速入门
[保持原有内容不变]

#### Day 2 - Tailwind CSS + 页面布局
[保持原有内容不变]

... [Day 3-21保持原有ai-teacher-plan.md的内容]

---

## Phase 2：全栈能力补强（Day 22-35）⭐

### Week 4：后端开发深度学习

#### Day 22 - PostgreSQL + Prisma基础

**学习目标：**
- 掌握关系型数据库设计
- 学会使用Prisma ORM
- 能设计合理的数据库表结构

**学习内容：**
1. PostgreSQL安装和基础
2. SQL基础（CRUD、JOIN、索引）
3. Prisma快速入门

**实战任务：**
```bash
# 1. 安装PostgreSQL（推荐使用Docker）
docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres

# 2. 初始化Prisma项目
npm install -D prisma
npx prisma init

# 3. 设计数据库Schema
# prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  analyses  Analysis[]
}

model Analysis {
  id          String   @id @default(uuid())
  url         String
  score       Float
  fcp         Float
  lcp         Float
  report      Json
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
}

# 4. 创建数据库表
npx prisma migrate dev --name init

# 5. 生成Prisma Client
npx prisma generate
```

**给lighthouse-ai-analyzer加数据库：**
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// app/api/analysis/save/route.ts
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const { userId, url, result } = await req.json()
  
  const analysis = await prisma.analysis.create({
    data: {
      url,
      score: result.performance,
      fcp: result.fcp,
      lcp: result.lcp,
      report: result,
      userId,
    },
  })
  
  return Response.json(analysis)
}

// 查询历史记录
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  
  const analyses = await prisma.analysis.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  
  return Response.json(analyses)
}
```

**检查标准：**
- [ ] PostgreSQL运行正常
- [ ] Prisma Schema设计合理
- [ ] 能成功创建和查询数据
- [ ] lighthouse-ai-analyzer集成数据库

**时间安排：** 6小时

---

#### Day 23 - Redis缓存实战

**学习目标：**
- 掌握Redis基本操作
- 理解缓存策略
- 能实现Rate Limiting

**学习内容：**
1. Redis安装和基础命令
2. 缓存策略（Cache Aside、Write Through）
3. Session存储
4. Rate Limiting实现

**实战任务：**
```typescript
// 1. 安装Redis
npm install ioredis

// 2. 配置Redis客户端
// lib/redis.ts
import Redis from 'ioredis'

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
})

// 3. 缓存Lighthouse结果
// app/api/analyze/route.ts
import { redis } from '@/lib/redis'
import { runLighthouse } from '@/lib/lighthouse'

export async function POST(req: Request) {
  const { url } = await req.json()
  
  // 生成缓存key
  const cacheKey = `analysis:${url}`
  
  // 1. 先查缓存
  const cached = await redis.get(cacheKey)
  if (cached) {
    return Response.json({
      fromCache: true,
      data: JSON.parse(cached),
    })
  }
  
  // 2. 没有缓存，执行分析
  const result = await runLighthouse(url)
  
  // 3. 缓存结果（1小时过期）
  await redis.setex(cacheKey, 3600, JSON.stringify(result))
  
  return Response.json({
    fromCache: false,
    data: result,
  })
}

// 4. 实现Rate Limiting
// middleware.ts
import { redis } from '@/lib/redis'

export async function rateLimiter(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const key = `ratelimit:${ip}`
  
  // 获取当前请求次数
  const count = await redis.incr(key)
  
  // 第一次请求，设置过期时间
  if (count === 1) {
    await redis.expire(key, 60) // 1分钟
  }
  
  // 超过限制（10次/分钟）
  if (count > 10) {
    return new Response('请求过于频繁，请稍后再试', { status: 429 })
  }
  
  return null
}
```

**检查标准：**
- [ ] Redis运行正常
- [ ] 缓存功能work
- [ ] Rate Limiting生效
- [ ] 有性能提升（对比缓存前后）

**时间安排：** 4小时

---

#### Day 24-25 - 用户认证系统

**学习目标：**
- 掌握JWT认证流程
- 实现完整的用户系统
- 理解安全最佳实践

**学习内容：**
1. NextAuth.js使用
2. JWT原理和实践
3. Password hashing（bcrypt）
4. Session管理

**实战任务：**

**Day 24上午：集成NextAuth.js**
```bash
npm install next-auth @auth/prisma-adapter bcryptjs
npm install -D @types/bcryptjs
```

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.hashedPassword) {
          return null
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        )

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

**Day 24下午-25：注册登录页面**
```typescript
// app/api/register/route.ts
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json()
    
    // 验证输入
    if (!email || !password) {
      return Response.json(
        { error: "邮箱和密码是必填的" },
        { status: 400 }
      )
    }
    
    // 检查用户是否已存在
    const exists = await prisma.user.findUnique({
      where: { email }
    })
    
    if (exists) {
      return Response.json(
        { error: "用户已存在" },
        { status: 400 }
      )
    }
    
    // Hash密码
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // 创建用户
    const user = await prisma.user.create({
      data: {
        email,
        name,
        hashedPassword,
      },
    })
    
    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    })
  } catch (error) {
    return Response.json(
      { error: "注册失败" },
      { status: 500 }
    )
  }
}

// app/login/page.tsx
'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    
    if (result?.error) {
      setError('登录失败，请检查邮箱和密码')
    } else {
      router.push('/dashboard')
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">登录</h1>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <input
        type="email"
        placeholder="邮箱"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-3 border rounded mb-4"
        required
      />
      
      <input
        type="password"
        placeholder="密码"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-3 border rounded mb-4"
        required
      />
      
      <button
        type="submit"
        className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700"
      >
        登录
      </button>
    </form>
  )
}
```

**检查标准：**
- [ ] 注册功能正常
- [ ] 登录功能正常
- [ ] Session持久化
- [ ] 受保护的路由正常工作

**时间安排：** 12小时（Day 24-25）

---

#### Day 26-27 - RESTful API设计

**学习目标：**
- 掌握RESTful API规范
- 实现输入验证
- 统一错误处理

**学习内容：**
1. REST设计原则
2. Zod输入验证
3. API文档（Swagger）
4. 错误处理中间件

**实战任务：**
```bash
npm install zod
```

```typescript
// lib/validation.ts
import { z } from 'zod'

export const analysisSchema = z.object({
  url: z.string().url('请输入有效的URL'),
  userId: z.string().uuid('无效的用户ID'),
})

export const userUpdateSchema = z.object({
  name: z.string().min(2, '名字至少2个字符').optional(),
  email: z.string().email('请输入有效的邮箱').optional(),
})

// app/api/analysis/route.ts
import { analysisSchema } from '@/lib/validation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(req: Request) {
  try {
    // 1. 认证检查
    const session = await getServerSession(authOptions)
    if (!session) {
      return Response.json({ error: '未授权' }, { status: 401 })
    }
    
    // 2. 输入验证
    const body = await req.json()
    const result = analysisSchema.safeParse(body)
    
    if (!result.success) {
      return Response.json(
        { errors: result.error.errors },
        { status: 400 }
      )
    }
    
    // 3. 业务逻辑
    const analysis = await runLighthouse(result.data.url)
    
    // 4. 保存到数据库
    const saved = await prisma.analysis.create({
      data: {
        url: result.data.url,
        userId: result.data.userId,
        ...analysis,
      },
    })
    
    return Response.json(saved)
  } catch (error) {
    console.error('Analysis error:', error)
    return Response.json(
      { error: '分析失败' },
      { status: 500 }
    )
  }
}

// GET /api/analysis - 获取历史记录
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ error: '未授权' }, { status: 401 })
  }
  
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  
  const analyses = await prisma.analysis.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  })
  
  const total = await prisma.analysis.count({
    where: { userId: session.user.id },
  })
  
  return Response.json({
    data: analyses,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
```

**检查标准：**
- [ ] API符合RESTful规范
- [ ] 输入验证完整
- [ ] 错误处理统一
- [ ] 有分页功能

**时间安排：** 12小时（Day 26-27）

---

#### Day 28 - Week 4总结与优化

**任务：**
1. 代码审查和重构
2. 添加测试（至少关键API）
3. 性能优化
4. 文档完善

**检查清单：**
- [ ] 所有API都有认证
- [ ] 所有输入都验证
- [ ] 数据库查询有索引
- [ ] Redis缓存work
- [ ] 有基本的测试

---

### Week 5：全栈项目实战

#### Day 29-35：AI智能笔记应用

**项目目标：**
构建一个完整的全栈AI应用，类似Notion AI

**核心功能：**
1. Markdown编辑器
2. AI续写/改写/总结
3. 笔记分类和搜索
4. 用户系统和权限
5. 实时协作（WebSocket）

**Day 29：** 项目架构和数据库设计
**Day 30：** 编辑器集成（TipTap或Lexical）
**Day 31：** AI功能实现
**Day 32：** 搜索功能（全文检索）
**Day 33：** 实时协作（WebSocket）
**Day 34：** UI优化和测试
**Day 35：** 部署上线

[详细内容见enhanced-10week-plan.md]

---

## Phase 3：AI Agent开发（Day 36-56）⭐

[详细内容见phase2-plan.md的Week 6-8]

---

## Phase 4：高级AI应用（Day 57-70）⭐

[详细内容见phase2-plan.md的Week 9-10]

---

## 🎯 10周学习成果

完成后你将拥有：

### 硬实力
- ✅ Next.js全栈开发
- ✅ PostgreSQL + Redis
- ✅ 用户认证和权限
- ✅ RESTful API设计
- ✅ AI集成（基础+高级）
- ✅ LangChain.js Agent开发
- ✅ RAG应用架构
- ✅ Multi-Agent系统

### 项目成果
1. lighthouse-ai-analyzer（AI性能分析）
2. AI智能笔记（全栈项目）
3. AI代码审查Agent
4. AI技术顾问（RAG）
5. AI内容创作平台（Multi-Agent）
6. 综合AI应用（自选）

### 市场价值
- 💼 AI全栈应用开发工程师
- 💼 AI Agent架构师
- 💰 薪资范围：50-80万
- 🚀 稀缺度：⭐⭐⭐⭐⭐

---

**开始吧！明天早上9:04，AI导师会推送Day 1的任务！** 🚀
