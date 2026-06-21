# Phase 2 全栈能力补强 - Day 25-35（续）

## Day 25-26：后端架构设计（12小时）

### Day 25上午：分层架构（3小时）

**学习内容：**
```
分层架构模式（Layered Architecture）

┌─────────────────────────────┐
│   Presentation Layer        │ ← API Routes、Controller
│   (表现层)                   │
├─────────────────────────────┤
│   Business Logic Layer      │ ← Service、Domain Logic
│   (业务逻辑层)               │
├─────────────────────────────┤
│   Data Access Layer         │ ← Repository、ORM
│   (数据访问层)               │
├─────────────────────────────┤
│   Database                  │ ← PostgreSQL、Redis
└─────────────────────────────┘
```

**代码实现：**
```typescript
// 1. Data Access Layer - Repository模式
// lib/repositories/analysis.repository.ts
export class AnalysisRepository {
  async create(data: CreateAnalysisDto) {
    return await prisma.analysis.create({
      data,
      include: { user: true },
    })
  }
  
  async findById(id: string) {
    return await prisma.analysis.findUnique({
      where: { id },
      include: { user: true, favorites: true },
    })
  }
  
  async findByUserId(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit
    
    const [data, total] = await Promise.all([
      prisma.analysis.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: true },
      }),
      prisma.analysis.count({ where: { userId } }),
    ])
    
    return { data, total, page, limit }
  }
  
  async update(id: string, data: UpdateAnalysisDto) {
    return await prisma.analysis.update({
      where: { id },
      data,
    })
  }
  
  async delete(id: string) {
    return await prisma.analysis.delete({
      where: { id },
    })
  }
}

// 2. Business Logic Layer - Service模式
// lib/services/analysis.service.ts
export class AnalysisService {
  constructor(
    private analysisRepo: AnalysisRepository,
    private cacheService: CacheService,
    private lighthouseService: LighthouseService,
    private aiService: AiService
  ) {}
  
  async createAnalysis(userId: string, url: string) {
    // 1. 验证URL
    if (!this.isValidUrl(url)) {
      throw new Error('无效的URL')
    }
    
    // 2. 检查缓存
    const cached = await this.cacheService.get(`analysis:${url}`)
    if (cached) {
      return cached
    }
    
    // 3. 创建分析记录
    const analysis = await this.analysisRepo.create({
      userId,
      url,
      status: 'PENDING',
    })
    
    // 4. 异步执行分析（后台任务）
    this.runAnalysisAsync(analysis.id, url)
    
    return analysis
  }
  
  private async runAnalysisAsync(analysisId: string, url: string) {
    try {
      // 更新状态
      await this.analysisRepo.update(analysisId, {
        status: 'RUNNING',
      })
      
      // 执行Lighthouse分析
      const lighthouseResult = await this.lighthouseService.run(url)
      
      // AI分析
      const aiAnalysis = await this.aiService.analyze(lighthouseResult)
      
      // 保存结果
      const result = await this.analysisRepo.update(analysisId, {
        status: 'COMPLETED',
        performance: lighthouseResult.performance,
        fcp: lighthouseResult.fcp,
        lcp: lighthouseResult.lcp,
        cls: lighthouseResult.cls,
        tti: lighthouseResult.tti,
        tbt: lighthouseResult.tbt,
        aiSummary: aiAnalysis.summary,
        suggestions: aiAnalysis.suggestions,
        report: lighthouseResult,
      })
      
      // 写入缓存
      await this.cacheService.set(`analysis:${url}`, result, 3600)
      
      return result
    } catch (error) {
      await this.analysisRepo.update(analysisId, {
        status: 'FAILED',
        errorMsg: error.message,
      })
      throw error
    }
  }
  
  async getAnalysis(id: string, userId: string) {
    const analysis = await this.analysisRepo.findById(id)
    
    if (!analysis) {
      throw new Error('分析记录不存在')
    }
    
    // 权限检查
    if (analysis.userId !== userId) {
      throw new Error('无权访问')
    }
    
    return analysis
  }
  
  async getUserAnalyses(userId: string, page: number, limit: number) {
    return await this.analysisRepo.findByUserId(userId, page, limit)
  }
  
  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}

// 3. Presentation Layer - API Routes
// app/api/analysis/route.ts
import { getServerSession } from 'next-auth'
import { AnalysisService } from '@/lib/services/analysis.service'

export async function POST(req: Request) {
  try {
    // 认证
    const session = await getServerSession()
    if (!session?.user) {
      return Response.json({ error: '未授权' }, { status: 401 })
    }
    
    // 验证输入
    const { url } = await req.json()
    if (!url) {
      return Response.json({ error: '缺少URL参数' }, { status: 400 })
    }
    
    // 调用服务
    const analysisService = new AnalysisService(...)
    const result = await analysisService.createAnalysis(session.user.id, url)
    
    return Response.json(result)
  } catch (error) {
    console.error('Analysis error:', error)
    return Response.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return Response.json({ error: '未授权' }, { status: 401 })
    }
    
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const analysisService = new AnalysisService(...)
    const result = await analysisService.getUserAnalyses(
      session.user.id,
      page,
      limit
    )
    
    return Response.json(result)
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

### Day 25下午：依赖注入和IoC（3小时）

```typescript
// 1. 依赖注入容器
// lib/container.ts
import 'reflect-metadata'
import { Container } from 'inversify'

export const container = new Container()

// 注册服务
container.bind(AnalysisRepository).toSelf()
container.bind(UserRepository).toSelf()
container.bind(CacheService).toSelf()
container.bind(LighthouseService).toSelf()
container.bind(AiService).toSelf()
container.bind(AnalysisService).toSelf()

// 2. 使用装饰器
import { injectable, inject } from 'inversify'

@injectable()
export class AnalysisService {
  constructor(
    @inject(AnalysisRepository) private analysisRepo: AnalysisRepository,
    @inject(CacheService) private cacheService: CacheService,
    @inject(LighthouseService) private lighthouseService: LighthouseService,
    @inject(AiService) private aiService: AiService
  ) {}
  
  // 方法实现...
}

// 3. 在API中使用
import { container } from '@/lib/container'

export async function POST(req: Request) {
  const analysisService = container.get<AnalysisService>(AnalysisService)
  // 使用service...
}
```

### Day 26：性能优化（6小时）

#### 1. 数据库查询优化

```typescript
// 1. N+1问题优化
// ❌ 错误：N+1查询
async function getAnalysesWithUser() {
  const analyses = await prisma.analysis.findMany()
  
  for (const analysis of analyses) {
    analysis.user = await prisma.user.findUnique({
      where: { id: analysis.userId }
    })
  }
  
  return analyses
}

// ✅ 正确：使用include
async function getAnalysesWithUser() {
  return await prisma.analysis.findMany({
    include: { user: true }
  })
}

// 2. 索引优化
// 慢查询：按创建时间排序
// SELECT * FROM analyses WHERE user_id = ? ORDER BY created_at DESC;

// 添加复合索引
@@index([userId, createdAt(sort: Desc)])

// 3. 分页优化 - 使用游标分页
async function getCursorPagination(cursor?: string, limit: number = 10) {
  return await prisma.analysis.findMany({
    take: limit,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
  })
}

// 4. 批量查询优化
async function batchGetUsers(userIds: string[]) {
  return await prisma.user.findMany({
    where: { id: { in: userIds } }
  })
}

// 5. 使用原始查询优化复杂统计
async function getAnalyticsStats(userId: string) {
  const result = await prisma.$queryRaw`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count,
      AVG(performance) as avg_performance
    FROM analyses
    WHERE user_id = ${userId}
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 30
  `
  
  return result
}
```

#### 2. API性能优化

```typescript
// 1. 响应压缩
import { gzip } from 'zlib'
import { promisify } from 'util'

const gzipAsync = promisify(gzip)

export async function GET(req: Request) {
  const data = await fetchLargeData()
  const json = JSON.stringify(data)
  
  // 检查客户端是否支持gzip
  const acceptEncoding = req.headers.get('accept-encoding') || ''
  
  if (acceptEncoding.includes('gzip')) {
    const compressed = await gzipAsync(Buffer.from(json))
    return new Response(compressed, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
      },
    })
  }
  
  return Response.json(data)
}

// 2. ETag缓存
export async function GET(req: Request) {
  const data = await fetchData()
  const etag = generateETag(data)
  
  // 检查If-None-Match
  const clientEtag = req.headers.get('if-none-match')
  if (clientEtag === etag) {
    return new Response(null, { status: 304 })
  }
  
  return Response.json(data, {
    headers: { 'ETag': etag },
  })
}

// 3. 请求合并（防抖）
const pendingRequests = new Map<string, Promise<any>>()

async function deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!
  }
  
  const promise = fn().finally(() => {
    pendingRequests.delete(key)
  })
  
  pendingRequests.set(key, promise)
  return promise
}

// 使用
export async function GET(req: Request) {
  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')!
  
  return deduplicate(`user-${userId}`, async () => {
    const data = await fetchUserData(userId)
    return Response.json(data)
  })
}

// 4. 流式响应
export async function GET(req: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      const analyses = await prisma.analysis.findMany({
        take: 1000,
      })
      
      controller.enqueue('[')
      
      for (let i = 0; i < analyses.length; i++) {
        if (i > 0) controller.enqueue(',')
        controller.enqueue(JSON.stringify(analyses[i]))
      }
      
      controller.enqueue(']')
      controller.close()
    },
  })
  
  return new Response(stream, {
    headers: { 'Content-Type': 'application/json' },
  })
}
```

#### 3. Redis性能优化

```typescript
// 1. Pipeline（批量操作）
async function batchCache(items: Array<{ key: string; value: any }>) {
  const pipeline = redis.pipeline()
  
  for (const { key, value } of items) {
    pipeline.setex(key, 3600, JSON.stringify(value))
  }
  
  await pipeline.exec()
}

// 2. Lua脚本（原子操作）
const incrementWithMaxScript = `
  local current = redis.call('GET', KEYS[1])
  if not current then
    current = 0
  end
  
  if tonumber(current) < tonumber(ARGV[1]) then
    return redis.call('INCR', KEYS[1])
  else
    return -1
  end
`

async function incrementWithMax(key: string, max: number) {
  const result = await redis.eval(
    incrementWithMaxScript,
    1,
    key,
    max
  )
  return result
}

// 3. 连接池优化
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  lazyConnect: false,
  // 连接池配置
  keepAlive: 30000,
  connectTimeout: 10000,
  maxRetries: 3,
})
```

---

## Day 27-28：可观测性和监控（12小时）

### Day 27：日志和追踪

```typescript
// 1. 结构化日志
import winston from 'winston'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
})

// 使用
logger.info('Analysis created', {
  userId: 'xxx',
  analysisId: 'yyy',
  url: 'https://example.com',
  duration: 1234,
})

// 2. 请求追踪
import { v4 as uuidv4 } from 'uuid'

export async function middleware(req: Request) {
  const requestId = uuidv4()
  
  // 注入到headers
  const headers = new Headers(req.headers)
  headers.set('x-request-id', requestId)
  
  // 记录请求开始
  const start = Date.now()
  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.url,
  })
  
  // 继续处理
  const response = await next()
  
  // 记录请求结束
  logger.info('Request completed', {
    requestId,
    duration: Date.now() - start,
    status: response.status,
  })
  
  return response
}

// 3. 错误追踪
class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

function errorHandler(error: Error) {
  if (error instanceof AppError) {
    logger.error('Application error', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
    })
  } else {
    logger.error('Unexpected error', {
      message: error.message,
      stack: error.stack,
    })
  }
}
```

### Day 28：监控和告警

```typescript
// 1. 性能监控
class MetricsCollector {
  private metrics = new Map<string, number[]>()
  
  record(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(value)
  }
  
  getStats(name: string) {
    const values = this.metrics.get(name) || []
    if (values.length === 0) return null
    
    const sorted = values.sort((a, b) => a - b)
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    }
  }
}

export const metrics = new MetricsCollector()

// 使用
async function someOperation() {
  const start = Date.now()
  try {
    // 操作...
  } finally {
    metrics.record('operation_duration', Date.now() - start)
  }
}

// 2. 健康检查
export async function GET(req: Request) {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    disk: await checkDiskSpace(),
    memory: await checkMemory(),
  }
  
  const healthy = Object.values(checks).every(c => c.healthy)
  
  return Response.json(
    { healthy, checks },
    { status: healthy ? 200 : 503 }
  )
}

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { healthy: true }
  } catch (error) {
    return { healthy: false, error: error.message }
  }
}

// 3. 告警
async function checkAndAlert() {
  const stats = metrics.getStats('api_latency')
  
  if (stats && stats.p95 > 1000) {
    await sendAlert({
      level: 'warning',
      message: 'API延迟过高',
      details: `P95延迟: ${stats.p95}ms`,
    })
  }
}
```

---

## 检查标准和验收

### Week 4总体检查标准

**数据库：**
- [ ] Schema设计符合三范式
- [ ] 索引设计合理（查询<100ms）
- [ ] Migration可回滚
- [ ] 有外键约束和级联

**缓存：**
- [ ] 缓存命中率>80%
- [ ] 无缓存穿透/雪崩/击穿
- [ ] 有监控指标

**后端架构：**
- [ ] 分层清晰（Repository-Service-Controller）
- [ ] 有依赖注入
- [ ] 代码可测试

**性能：**
- [ ] API响应<200ms（P95）
- [ ] 数据库查询<50ms
- [ ] 无N+1问题

**可观测性：**
- [ ] 有结构化日志
- [ ] 有请求追踪
- [ ] 有健康检查接口
- [ ] 有性能监控

---

继续Week 5...
