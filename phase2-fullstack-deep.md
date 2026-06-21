# 🚀 Phase 2：全栈能力深度补强计划（Week 4-5，14天）

## 🎯 目标：从前端工程师到全栈架构师

### 核心能力提升
1. **数据库设计** - 从0到1设计企业级数据库
2. **后端架构** - 掌握分层架构、领域驱动设计
3. **缓存策略** - Redis深度应用和性能优化
4. **性能优化** - 数据库优化、API优化、系统优化
5. **可观测性** - 监控、日志、追踪

---

## 📅 详细14天计划

### Week 4：后端基础架构（Day 22-28）

#### Day 22：数据库设计基础

**上午：数据库设计理论（3小时）**
```
学习内容：
1. 数据库设计三范式
   - 第一范式：列不可分
   - 第二范式：消除部分依赖
   - 第三范式：消除传递依赖
   
2. ER图设计
   - 实体（Entity）
   - 属性（Attribute）
   - 关系（Relationship）

3. 索引设计原则
   - 主键索引
   - 唯一索引
   - 复合索引
   - 覆盖索引

4. 数据类型选择
   - 数字类型（INT、BIGINT）
   - 字符串类型（VARCHAR、TEXT）
   - 时间类型（TIMESTAMP、DATE）
   - JSON类型

5. 约束设计
   - 主键约束
   - 外键约束
   - 唯一约束
   - 检查约束
```

**下午：Prisma ORM实战（3小时）**
```typescript
// 1. 安装和配置
npm install prisma @prisma/client
npx prisma init

// 2. 设计lighthouse-ai-analyzer的数据库Schema
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// 用户表
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  name          String?
  hashedPassword String?
  avatar        String?
  role          Role      @default(USER)
  
  analyses      Analysis[]
  favorites     Favorite[]
  apiKeys       ApiKey[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([email])
  @@map("users")
}

enum Role {
  USER
  ADMIN
}

// 分析记录表
model Analysis {
  id          String   @id @default(uuid())
  url         String
  
  // 性能指标
  performance Float
  fcp         Float
  lcp         Float
  cls         Float
  tti         Float
  tbt         Float
  
  // AI分析结果
  aiSummary   String   @db.Text
  suggestions Json     // 建议列表
  report      Json     // 完整报告
  
  // 元数据
  status      Status   @default(PENDING)
  errorMsg    String?
  
  // 关联
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  favorites   Favorite[]
  
  createdAt   DateTime @default(now())
  
  @@index([userId, createdAt(sort: Desc)])
  @@index([url])
  @@map("analyses")
}

enum Status {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

// 收藏表
model Favorite {
  id         String   @id @default(uuid())
  userId     String
  analysisId String
  
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  analysis   Analysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  
  createdAt  DateTime @default(now())
  
  @@unique([userId, analysisId])
  @@map("favorites")
}

// API密钥表（用于rate limiting）
model ApiKey {
  id         String   @id @default(uuid())
  key        String   @unique
  name       String
  
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Rate limiting
  requestCount Int    @default(0)
  lastUsedAt   DateTime?
  
  expiresAt  DateTime?
  isActive   Boolean  @default(true)
  
  createdAt  DateTime @default(now())
  
  @@index([key])
  @@map("api_keys")
}

// 3. 生成migration
npx prisma migrate dev --name init

// 4. 生成Prisma Client
npx prisma generate
```

**设计要点：**
- ✅ 使用UUID作为主键（分布式友好）
- ✅ 添加合理的索引（查询优化）
- ✅ 使用级联删除（数据一致性）
- ✅ 使用枚举类型（类型安全）
- ✅ JSON字段存储复杂数据
- ✅ 时间戳字段（审计追踪）

**检查标准：**
- [ ] Schema设计合理（符合三范式）
- [ ] 索引设计优化（查询性能）
- [ ] 关系设计正确（外键约束）
- [ ] 能成功执行migration

---

#### Day 23：Redis缓存深度应用

**上午：Redis基础和数据结构（3小时）**
```typescript
// 1. Redis数据结构选择
import Redis from 'ioredis'

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  db: 0,
})

// 2. String - 缓存分析结果
async function cacheAnalysis(url: string, result: any) {
  const key = `analysis:${url}`
  await redis.setex(key, 3600, JSON.stringify(result)) // 1小时过期
}

async function getCachedAnalysis(url: string) {
  const key = `analysis:${url}`
  const cached = await redis.get(key)
  return cached ? JSON.parse(cached) : null
}

// 3. Hash - 用户会话
async function setUserSession(userId: string, sessionData: any) {
  const key = `session:${userId}`
  await redis.hmset(key, sessionData)
  await redis.expire(key, 86400) // 24小时
}

async function getUserSession(userId: string) {
  const key = `session:${userId}`
  return await redis.hgetall(key)
}

// 4. List - 最近分析记录
async function addRecentAnalysis(userId: string, analysisId: string) {
  const key = `recent:${userId}`
  await redis.lpush(key, analysisId)
  await redis.ltrim(key, 0, 9) // 保留最近10条
}

async function getRecentAnalyses(userId: string) {
  const key = `recent:${userId}`
  return await redis.lrange(key, 0, 9)
}

// 5. Set - 用户收藏
async function addFavorite(userId: string, analysisId: string) {
  const key = `favorites:${userId}`
  await redis.sadd(key, analysisId)
}

async function removeFavorite(userId: string, analysisId: string) {
  const key = `favorites:${userId}`
  await redis.srem(key, analysisId)
}

async function isFavorite(userId: string, analysisId: string) {
  const key = `favorites:${userId}`
  return await redis.sismember(key, analysisId)
}

// 6. Sorted Set - 排行榜
async function updateLeaderboard(userId: string, score: number) {
  await redis.zadd('leaderboard', score, userId)
}

async function getTopUsers(limit: number = 10) {
  return await redis.zrevrange('leaderboard', 0, limit - 1, 'WITHSCORES')
}
```

**下午：缓存策略和性能优化（3小时）**
```typescript
// 1. Cache Aside模式（最常用）
async function getAnalysisWithCache(analysisId: string) {
  // 先查缓存
  const cached = await redis.get(`analysis:${analysisId}`)
  if (cached) {
    return JSON.parse(cached)
  }
  
  // 缓存未命中，查数据库
  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: { user: true },
  })
  
  if (analysis) {
    // 写入缓存
    await redis.setex(
      `analysis:${analysisId}`,
      3600,
      JSON.stringify(analysis)
    )
  }
  
  return analysis
}

// 2. 缓存穿透防护（布隆过滤器）
import { BloomFilter } from 'bloom-filters'

const bloomFilter = new BloomFilter(10000, 4)

async function getWithBloomFilter(analysisId: string) {
  // 先用布隆过滤器判断
  if (!bloomFilter.has(analysisId)) {
    return null // 一定不存在
  }
  
  // 可能存在，继续查询
  return await getAnalysisWithCache(analysisId)
}

// 3. 缓存雪崩防护（随机过期时间）
async function cacheWithRandomExpire(key: string, value: any, baseExpire: number) {
  const randomExpire = baseExpire + Math.floor(Math.random() * 300) // +0~5分钟
  await redis.setex(key, randomExpire, JSON.stringify(value))
}

// 4. 缓存击穿防护（分布式锁）
async function getWithLock(key: string, fetchFn: () => Promise<any>) {
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)
  
  // 尝试获取锁
  const lockKey = `lock:${key}`
  const lockAcquired = await redis.set(lockKey, '1', 'EX', 10, 'NX')
  
  if (lockAcquired) {
    try {
      // 获取锁成功，执行查询
      const data = await fetchFn()
      await redis.setex(key, 3600, JSON.stringify(data))
      return data
    } finally {
      await redis.del(lockKey)
    }
  } else {
    // 获取锁失败，等待后重试
    await new Promise(resolve => setTimeout(resolve, 100))
    return await getWithLock(key, fetchFn)
  }
}

// 5. 预热缓存（应用启动时）
async function warmupCache() {
  console.log('开始预热缓存...')
  
  // 热门URL
  const popularUrls = await prisma.analysis.groupBy({
    by: ['url'],
    _count: true,
    orderBy: { _count: { url: 'desc' } },
    take: 100,
  })
  
  for (const { url } of popularUrls) {
    const analyses = await prisma.analysis.findMany({
      where: { url },
      orderBy: { createdAt: 'desc' },
      take: 1,
    })
    
    if (analyses.length > 0) {
      await redis.setex(
        `analysis:${url}`,
        3600,
        JSON.stringify(analyses[0])
      )
    }
  }
  
  console.log('缓存预热完成')
}

// 6. 监控缓存命中率
let cacheHits = 0
let cacheMisses = 0

async function getWithMetrics(key: string) {
  const cached = await redis.get(key)
  
  if (cached) {
    cacheHits++
    return JSON.parse(cached)
  } else {
    cacheMisses++
    return null
  }
}

function getCacheHitRate() {
  const total = cacheHits + cacheMisses
  return total > 0 ? (cacheHits / total * 100).toFixed(2) + '%' : '0%'
}
```

**检查标准：**
- [ ] 缓存策略合理（避免穿透、雪崩、击穿）
- [ ] 命中率 > 80%
- [ ] 过期时间设置合理
- [ ] 有监控指标

---

#### Day 24：Rate Limiting和API安全

**学习内容（6小时）**
```typescript
// 1. 固定窗口限流
async function fixedWindowRateLimit(userId: string, limit: number = 10) {
  const key = `ratelimit:${userId}:${Math.floor(Date.now() / 60000)}`
  
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.expire(key, 60)
  }
  
  if (count > limit) {
    throw new Error('请求过于频繁')
  }
  
  return {
    remaining: Math.max(0, limit - count),
    reset: Math.ceil(Date.now() / 60000) * 60000,
  }
}

// 2. 滑动窗口限流（更精确）
async function slidingWindowRateLimit(userId: string, limit: number = 10, window: number = 60) {
  const key = `ratelimit:sliding:${userId}`
  const now = Date.now()
  const windowStart = now - window * 1000
  
  // 删除过期记录
  await redis.zremrangebyscore(key, 0, windowStart)
  
  // 获取当前窗口内的请求数
  const count = await redis.zcard(key)
  
  if (count >= limit) {
    throw new Error('请求过于频繁')
  }
  
  // 添加当前请求
  await redis.zadd(key, now, `${now}`)
  await redis.expire(key, window)
  
  return {
    remaining: limit - count - 1,
    reset: windowStart + window * 1000,
  }
}

// 3. Token Bucket（令牌桶）
class TokenBucket {
  constructor(
    private capacity: number,
    private refillRate: number,
    private redis: Redis
  ) {}
  
  async consume(userId: string, tokens: number = 1): Promise<boolean> {
    const key = `bucket:${userId}`
    
    // 获取当前状态
    const data = await this.redis.get(key)
    let current = this.capacity
    let lastRefill = Date.now()
    
    if (data) {
      const parsed = JSON.parse(data)
      current = parsed.tokens
      lastRefill = parsed.lastRefill
    }
    
    // 计算新增令牌
    const now = Date.now()
    const elapsed = (now - lastRefill) / 1000
    const newTokens = Math.min(this.capacity, current + elapsed * this.refillRate)
    
    if (newTokens >= tokens) {
      // 消费令牌
      await this.redis.setex(
        key,
        3600,
        JSON.stringify({
          tokens: newTokens - tokens,
          lastRefill: now,
        })
      )
      return true
    }
    
    return false
  }
}

// 4. API密钥管理
async function validateApiKey(key: string) {
  const apiKey = await prisma.apiKey.findUnique({
    where: { key },
    include: { user: true },
  })
  
  if (!apiKey || !apiKey.isActive) {
    throw new Error('无效的API密钥')
  }
  
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    throw new Error('API密钥已过期')
  }
  
  // 更新使用统计
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: {
      requestCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  })
  
  return apiKey
}

// 5. 中间件集成
export async function rateLimitMiddleware(req: Request) {
  const apiKey = req.headers.get('x-api-key')
  
  if (!apiKey) {
    return new Response('缺少API密钥', { status: 401 })
  }
  
  try {
    const keyData = await validateApiKey(apiKey)
    
    // 根据用户等级设置不同限额
    const limit = keyData.user.role === 'ADMIN' ? 100 : 10
    await slidingWindowRateLimit(keyData.userId, limit)
    
    return null // 通过验证
  } catch (error) {
    return new Response(error.message, { status: 429 })
  }
}
```

**检查标准：**
- [ ] Rate Limiting生效
- [ ] API密钥验证正常
- [ ] 不同用户等级有不同限额
- [ ] 有清晰的错误提示

---

### Day 25-26：后端架构设计

[继续下一部分...]
