# Day 1 学习日志

**日期**：2026-06-21  
**项目**：P1 智能异常监控平台  
**学习时长**：2 小时

---

## 📚 今天学到的核心概念

### 1. NestJS 模块化架构
**概念**：
- **Module**：组织代码的容器，类似 Vue 的插件系统
- **Controller**：处理 HTTP 请求，定义路由
- **Service**：业务逻辑层，可被多个 Controller 复用

**理解**：
```typescript
// Module 负责组装
@Module({
  controllers: [HealthController],  // 注册控制器
  providers: [HealthService],       // 注册服务
})
export class HealthModule {}

// Controller 负责路由
@Controller('api/health')
export class HealthController {
  constructor(private healthService: HealthService) {}  // 依赖注入
  
  @Get()
  check() {
    return this.healthService.getStatus();
  }
}

// Service 负责业务逻辑
@Injectable()
export class HealthService {
  getStatus() {
    return { status: 'ok', uptime: process.uptime() };
  }
}
```

**为什么这样设计？**
- ✅ 职责分离：Controller 只管路由，Service 只管逻辑
- ✅ 可复用：Service 可以被多个 Controller 调用
- ✅ 可测试：可以单独测试 Service，不依赖 HTTP

---

### 2. 依赖注入（Dependency Injection）
**概念**：
不用手动 `new` 对象，而是让 NestJS 的 IoC 容器自动创建和管理实例。

**对比**：
```typescript
// ❌ 不用依赖注入
class HealthController {
  private healthService: HealthService;
  
  constructor() {
    this.healthService = new HealthService();  // 手动创建，紧耦合
  }
}

// ✅ 使用依赖注入
class HealthController {
  constructor(private healthService: HealthService) {}  // 自动注入
}
```

**优势**：
- ✅ 解耦：不需要知道 Service 如何创建
- ✅ 单例：同一个 Service 实例可以被多处共享
- ✅ 可测试：可以轻松 mock Service 进行单元测试

**核心装饰器**：
- `@Injectable()`：告诉 NestJS 这个类可以被注入
- `@Module({ providers: [...] })`：注册可注入的类

---

### 3. ConfigModule 环境变量管理
**概念**：
使用 `@nestjs/config` 统一管理环境变量，而不是直接用 `process.env`。

**配置**：
```typescript
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,  // 全局可用，不用每个模块都 import
      envFilePath: ['.env.local', '.env'],
    }),
  ],
})

// 使用
@Injectable()
export class HealthService {
  constructor(private configService: ConfigService) {}
  
  getPort() {
    return this.configService.get('PORT', 3000);  // 第二个参数是默认值
  }
}
```

**为什么要用 ConfigModule？**
- ✅ 类型安全：可以加 schema 校验
- ✅ 统一管理：所有配置集中在一处
- ✅ 多环境：支持 .env.local / .env.production
- ✅ 依赖注入：ConfigService 可以被注入到任何地方

---

## 🛠️ 今天完成的任务

### ✅ 已完成
- [x] 创建 NestJS 后端项目骨架
- [x] 安装依赖（@nestjs/config, ai, zod 等）
- [x] 创建 HealthModule（health.module.ts）
- [x] 实现 HealthController（路由：GET /api/health）
- [x] 实现 HealthService（返回服务状态）
- [x] 配置 ConfigModule（环境变量管理）
- [x] 创建 .env 和 .env.example
- [x] 理解 NestJS 的依赖注入机制

### ⏳ 未完成
- [ ] 创建前端项目（时间不够，留到明天）
- [ ] 测试接口（需要先启动服务）
- [ ] 写架构文档

---

## 🐛 遇到的问题 + 解决方案

### 问题 1：为什么 HealthService 不需要手动 new？
**疑问**：
在 HealthController 的 constructor 里，HealthService 是怎么自动出现的？

**答案**：
NestJS 的 IoC（控制反转）容器会：
1. 扫描 `@Module({ providers: [HealthService] })`
2. 发现 HealthService 有 `@Injectable()` 装饰器
3. 自动创建 HealthService 实例
4. 当 HealthController 需要时，自动注入

**关键**：
- HealthService 必须在 Module 的 `providers` 数组中注册
- HealthService 必须有 `@Injectable()` 装饰器
- HealthController 通过 `constructor` 声明依赖

---

### 问题 2：ConfigService 从哪里来？
**疑问**：
我没有手动 import ConfigService，为什么可以直接注入？

**答案**：
因为在 `app.module.ts` 中配置了：
```typescript
ConfigModule.forRoot({
  isGlobal: true,  // ← 关键！全局可用
})
```

设置了 `isGlobal: true` 后，ConfigService 可以在**任何地方**被注入，不需要每个 Module 都 import ConfigModule。

---

### 问题 3：.env 文件要不要提交到 git？
**答案**：
- ❌ `.env` - **不提交**（包含敏感信息，如 API Key）
- ✅ `.env.example` - **要提交**（模板，不包含真实值）

**操作**：
```bash
# .gitignore 中添加
.env
.env.local

# 创建 .env.example 作为模板
PORT=3000
DATABASE_URL=""
OLLAMA_BASE_URL="http://localhost:11434"  # 使用本地 Ollama
```

---

## 🤔 还不懂的地方（正常，后面会懂）

1. **Middleware / Guard / Interceptor / Pipe 的区别是什么？**
   - 知道它们都是 NestJS 的中间件
   - 但还不清楚具体用途和执行顺序
   - → Day 7 会学习 Guard（鉴权）

2. **Prisma ORM 怎么用？**
   - 知道它是数据库 ORM
   - 但还没实际操作过
   - → Day 2 会深入学习

3. **Vercel AI SDK 的 Tool Calling 是什么？**
   - 已经安装了 `ai` 包
   - 但还不知道如何使用
   - → Day 5 会实战

---

## 📝 核心代码片段（手写理解）

### 依赖注入示例
```typescript
// health.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()  // ← 告诉 NestJS：我可以被注入
export class HealthService {
  // ↓ 依赖注入：自动获取 ConfigService 实例
  constructor(private configService: ConfigService) {}
  
  getStatus() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      env: this.configService.get('NODE_ENV', 'development'),
      port: this.configService.get('PORT', 3000),
    };
  }
}
```

**理解要点**：
- `@Injectable()`：声明这个类可以被依赖注入
- `constructor(private configService: ConfigService)`：
  - `private`：自动创建 `this.configService` 属性
  - NestJS 会自动传入 ConfigService 实例
- `this.configService.get('PORT', 3000)`：
  - 第一个参数：环境变量名
  - 第二个参数：默认值

---

## 🎯 明天的计划（Day 2）

### 主要任务
- [ ] 安装配置 PostgreSQL（或使用 Docker）
- [ ] 集成 Prisma ORM
- [ ] 设计 7 张数据表（**核心任务，必须手写**）⭐⭐⭐
- [ ] 实现数据库迁移（`prisma migrate dev`）
- [ ] 创建 Seed 脚本（插入测试数据）

### 学习重点
- **数据库建模能力**：如何从 PRD 提取实体和关系
- **Prisma Schema 语法**：model / relation / enum 等
- **数据库迁移**：理解 migration 机制

### 准备工作（今晚可以做）
```bash
# 1. 安装 PostgreSQL（如果没有）
# 方式 1：Docker（推荐）
docker run -d \
  --name postgres-monitor \
  -e POSTGRES_USER=monitor \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=monitor \
  -p 5432:5432 \
  postgres:14

# 方式 2：本地安装
# 下载：https://www.postgresql.org/download/

# 2. 测试连接
psql -U monitor -d monitor -h localhost
```

---

## 💭 今天的思考

### NestJS vs Express
**Express**：
- 自由度高，但没有约束
- 项目大了容易乱
- 适合小项目、快速原型

**NestJS**：
- 强制模块化，有架构约束
- 依赖注入，代码更解耦
- 适合企业级项目、团队协作

**类比**：
- Express = 记事本（自由，但需要自律）
- NestJS = IDE（有约束，但更高效）

### 前端 vs 后端思维
**前端**（我熟悉的）：
- 组件化：UI 拆分成小组件
- 状态管理：Pinia / Vuex
- 单向数据流：props down, events up

**后端**（正在学习的）：
- 模块化：功能拆分成 Module
- 依赖注入：Service 复用
- 分层架构：Controller → Service → Repository

**共同点**：
都是**关注点分离**，只是表现形式不同。

---

## 📊 学习进度

### 技能树
```
NestJS 后端：
  ✅ Module / Controller / Service 架构
  ✅ 依赖注入（DI / IoC）
  ✅ ConfigModule 环境变量
  ⏳ Guards / Interceptors / Pipes
  ⏳ Prisma ORM
  ⏳ WebSocket
  ⏳ JWT 鉴权

AI SDK：
  ⏳ Vercel AI SDK
  ⏳ Ollama 集成（使用本地模型）⭐
  ⏳ Tool Calling
  ⏳ Multi-step Agent
```

### 时间分配
- 📚 阅读文档：30 分钟
- 💻 编码实战：80 分钟
- 📝 写学习日志：10 分钟
- **总计**：2 小时

---

## 🔗 参考资料

- [NestJS 中文文档](https://docs.nestjs.cn/)
- [NestJS First Steps](https://docs.nestjs.cn/10/firststeps)
- [依赖注入原理](https://docs.nestjs.cn/10/fundamentals?id=依赖注入)
- [Ollama 官方文档](https://ollama.ai/docs)

---

## 💪 今天的收获

**技术层面**：
- ✅ 理解了 NestJS 的核心架构思想
- ✅ 掌握了依赖注入的基本概念
- ✅ 能独立创建 Module / Controller / Service
- ✅ 会使用 ConfigModule 管理环境变量

**思维层面**：
- ✅ 开始理解"后端架构思维"
- ✅ 认识到"模块化 ≠ 组件化"，但底层思想相通
- ✅ 明白了"依赖注入"不是玄学，而是解耦工具

**心态层面**：
- ✅ **迈出了第一步**，克服了"开始的恐惧"
- ✅ 发现后端没有想象中那么难
- ✅ 对明天的学习充满期待

---

**Day 1 完成！明天见 🚀**

---

## 📌 备注

### 技术栈调整
- ✅ **LLM 模型**：使用本地 Ollama 而非 DeepSeek
- ✅ **优势**：
  - 免费使用
  - 数据隐私（本地运行）
  - 无需网络（离线可用）
  - 可选多种模型（llama3, qwen, deepseek-coder 等）

### .env 配置（使用 Ollama）
```bash
# 服务端口
PORT=3000

# 数据库
DATABASE_URL="postgresql://monitor:password@localhost:5432/monitor"

# Ollama 配置（本地模型）
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama3"  # 或 qwen2.5, deepseek-coder 等

# JWT 密钥
JWT_SECRET="your-secret-key-change-in-production"
```

### 明天使用 Ollama 注意事项
- 确保 Ollama 服务运行：`ollama serve`
- 拉取需要的模型：`ollama pull llama3`
- 测试模型：`ollama run llama3 "你好"`
