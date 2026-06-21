# Day 1：项目骨架 + NestJS 架构理解

**日期**：Day 1（周一晚）  
**时长**：2 小时  
**项目**：P1 智能异常监控平台

## 🎯 今日目标

- 搭建前后端项目骨架
- 理解 NestJS 模块化架构
- 跑通第一个接口
- 理解 NestJS 请求生命周期

## 📚 学习知识点

### 核心知识点
- **A1. NestJS 模块化架构**
  - Module / Controller / Service 三层
  - 依赖注入（DI / IoC）
  - Provider 注册与导出

### 为什么学这个
```
你 6 年前端经验，缺的是后端架构思维：
  ❌ 前端：组件化、props 传递
  ✅ 后端：模块化、依赖注入、分层架构

NestJS 的价值：
  - 强制模块化，养成架构思维
  - 装饰器语法，类似 Vue 的 @Component
  - TypeScript 原生，学习曲线平滑
```

## 📖 学习材料（30 分钟）

### 必读
1. **NestJS 中文文档：First Steps**（15 分钟）
   - 网址：https://docs.nestjs.cn/10/firststeps
   - 重点：理解 Module、Controller、Service 的关系
   - 跳过：WebSockets、微服务（Day 1 不需要）

2. **文章：「NestJS 与 Express 的本质区别」**（10 分钟）
   - 搜索关键词：NestJS vs Express 依赖注入
   - 重点：理解为什么 NestJS 更适合大型项目

3. **快速预览：Vercel AI SDK 首页**（5 分钟）
   - 网址：https://sdk.vercel.ai/docs
   - 只看首页，了解它是什么（Day 5 才深入）

### 可选
- NestJS 官方视频教程（英文，30 分钟）

## 💻 编码任务（90 分钟）

### 任务 1：创建项目骨架（30 分钟）

#### 步骤 1：安装 NestJS CLI
```bash
# 全局安装（如果已安装可跳过）
pnpm install -g @nestjs/cli

# 验证安装
nest --version  # 应显示版本号，如 10.x.x
```

#### 步骤 2：创建后端项目
```bash
# 创建项目目录
mkdir -p ~/projects/p1-monitor
cd ~/projects/p1-monitor

# 创建 NestJS 项目
nest new backend --package-manager pnpm

# 进入目录查看
cd backend
ls -la
# 应该看到：src/ test/ node_modules/ package.json...
```

**目录结构说明**：
```
backend/
├── src/
│   ├── app.controller.ts    # 控制器（路由处理）
│   ├── app.service.ts        # 服务（业务逻辑）
│   ├── app.module.ts         # 模块（组装）
│   └── main.ts               # 入口文件
├── test/                     # 测试文件
├── package.json
└── tsconfig.json
```

#### 步骤 3：安装依赖
```bash
# 基础依赖
pnpm add @nestjs/config @nestjs/swagger

# AI 相关（先装上，Day 5 用）
pnpm add ai @ai-sdk/openai-compatible zod

# 开发依赖
pnpm add -D @types/node
```

#### 步骤 4：启动开发服务
```bash
pnpm start:dev

# 看到输出：
# [Nest] 12345  - 2026/06/18, 21:00:00  LOG [NestFactory] Starting Nest application...
# [Nest] 12345  - 2026/06/18, 21:00:01  LOG [NestApplication] Nest application successfully started
```

浏览器访问 http://localhost:3000 → 应该看到 `Hello World!`

#### 步骤 5：创建前端项目（15 分钟）
```bash
# 回到项目根目录
cd ~/projects/p1-monitor

# 创建 Vue 3 项目
pnpm create vite frontend --template vue-ts

# 进入目录安装依赖
cd frontend
pnpm install

# 启动
pnpm dev

# 访问 http://localhost:5173 看到 Vue 默认页
```

**验收**：两个终端分别运行，前后端都能访问。

---

### 任务 2：理解 NestJS 架构（20 分钟）

#### 用 Claude Code 辅助学习

在 `backend/src/app.module.ts` 文件里，问 Claude Code：

```
请解释这个文件中的 @Module 装饰器做了什么？
为什么要用 imports / controllers / providers？
```

#### 手动实验：创建第一个模块

```bash
cd ~/projects/p1-monitor/backend

# 用 CLI 生成 health 模块
nest g module modules/health
nest g controller modules/health
nest g service modules/health
```

**观察变化**：
- 创建了 `src/modules/health/` 目录
- 自动在 `app.module.ts` 中注册了 `HealthModule`

**理解依赖注入**：

打开 `src/modules/health/health.controller.ts`，修改为：

```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('api/health')
export class HealthController {
  // 这里就是依赖注入！constructor 自动注入 service
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check() {
    return this.healthService.getStatus();
  }
}
```

打开 `src/modules/health/health.service.ts`，修改为：

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getStatus() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
```

**测试**：
```bash
curl http://localhost:3000/api/health

# 应返回：
# {"status":"ok","timestamp":"2026-06-18T13:00:00.000Z","uptime":123.456}
```

**思考题**（问 Claude Code）：
1. HealthService 的实例是什么时候创建的？
2. 如果我在另一个 Controller 也注入 HealthService，是同一个实例吗？
3. @Injectable() 装饰器的作用是什么？

---

### 任务 3：配置管理 + 环境变量（25 分钟）

#### 步骤 1：集成 @nestjs/config

修改 `src/app.module.ts`：

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 全局可用，不用每个模块都 import
      envFilePath: ['.env.local', '.env'], // 支持多环境
    }),
    HealthModule,
  ],
})
export class AppModule {}
```

#### 步骤 2：创建 .env 文件

在 `backend/` 目录下：

```bash
# 创建 .env
cat > .env << 'EOF'
# 服务端口
PORT=3000

# 数据库（Day 2 用）
DATABASE_URL="postgresql://user:pass@localhost:5432/monitor"

# DeepSeek API（Day 5 用）
DEEPSEEK_API_KEY=""

# JWT 密钥（Day 11 用）
JWT_SECRET="your-secret-key-change-in-production"
EOF

# 创建 .env.example（提交到 git）
cp .env .env.example
# 清空 .env.example 里的敏感信息

# 将 .env 加入 .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

#### 步骤 3：在 Service 中使用配置

修改 `health.service.ts`：

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
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

**测试**：再次访问 `/api/health`，应该看到 `env` 和 `port` 字段。

---

### 任务 4：架构文档 + Git 提交（15 分钟）

#### 画架构图

在项目根目录创建 `docs/` 目录：

```bash
cd ~/projects/p1-monitor
mkdir -p docs
```

创建 `docs/ARCHITECTURE.md`，用 Claude Code 帮你生成：

**Prompt**：
```
请用 Mermaid 画出 NestJS 的请求生命周期，包含：
1. Client 发请求
2. Middleware（日志）
3. Guard（鉴权）
4. Interceptor（响应转换）
5. Pipe（参数校验）
6. Controller（路由处理）
7. Service（业务逻辑）
8. Exception Filter（异常捕获）
9. 返回响应给 Client

每个环节用矩形框表示，用箭头连接。
```

保存到 `docs/ARCHITECTURE.md`。

#### Git 初始化

```bash
cd ~/projects/p1-monitor

git init
git add .
git commit -m "Day 1: 项目骨架 + NestJS 架构理解

- 创建前后端项目
- 实现 /api/health 接口
- 配置 @nestjs/config
- 理解 Module/Controller/Service 架构
"
```

---

## ✅ 验收清单

在完成今天任务前，请逐项检查：

- [ ] 后端 `pnpm start:dev` 能启动，无报错
- [ ] 前端 `pnpm dev` 能启动，能访问
- [ ] `curl http://localhost:3000/api/health` 返回正确 JSON
- [ ] `.env` 文件已创建且加入 .gitignore
- [ ] `docs/ARCHITECTURE.md` 包含 Mermaid 图（≥ 8 个节点）
- [ ] git commit 已提交（commit message 清晰）
- [ ] 能用自己的话解释：什么是依赖注入？为什么 NestJS 用它？

## 🤔 思考题（睡前思考，不必写代码）

1. **如果不用依赖注入**，HealthController 怎么拿到 HealthService？
   - 手动 `new HealthService()` 会有什么问题？
   
2. **NestJS 的模块化 vs Vue 的组件化**，有什么相同和不同？

3. **为什么后端要分 Controller 和 Service 两层**？
   - 能不能直接在 Controller 里写业务逻辑？

## 📝 今日总结

**学到了什么**：
- NestJS 的 Module / Controller / Service 三层架构
- 依赖注入的基本概念
- @nestjs/config 环境变量管理

**还不懂的（正常，后面会懂）**：
- Middleware / Guard / Interceptor / Pipe 的具体用法
- 数据库怎么集成
- AI SDK 怎么用

**明天预告**：
- Day 2 会接入 Postgres + Prisma
- 设计完整的数据模型（7 张表）
- 学习数据库迁移管理

---

## 💡 加餐内容（可选，如果还有时间）

### 加餐 1：Swagger 文档预览（15 分钟）

```bash
cd backend
pnpm add @nestjs/swagger
```

修改 `src/main.ts`：

```typescript
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger 配置
  const config = new DocumentBuilder()
    .setTitle('智能异常监控平台 API')
    .setDescription('P1 项目 API 文档')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
  console.log(`Swagger 文档: http://localhost:3000/api/docs`);
}
bootstrap();
```

访问 http://localhost:3000/api/docs 查看自动生成的 API 文档。

### 加餐 2：理解装饰器原理（15 分钟）

装饰器是 TypeScript 的语法糖，用 Claude Code 理解：

**Prompt**：
```
@Injectable() 装饰器背后做了什么？
能否用普通 JavaScript 代码模拟实现一个简单的 @Injectable()？
```

---

**Day 1 完成！明天见 🚀**
