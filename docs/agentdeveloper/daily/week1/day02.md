# Day 2：Postgres + Prisma + 数据建模

**日期**：Day 2（周二晚）  
**时长**：2 小时  
**项目**：P1 智能异常监控平台

## 🎯 今日目标

- 接入 Postgres 数据库
- 学习 Prisma ORM
- 设计完整数据模型（7 张表）
- 跑通第一次数据库迁移

## 📚 学习知识点

### 核心知识点
- **B1. Postgres 基础**
  - 数据类型（UUID / JSONB / Timestamp）
  - 索引（B-tree / 复合索引）
  - 关系（一对一 / 一对多 / 多对多）
  
- **B2. Prisma ORM**
  - schema.prisma 语法
  - Migration 管理
  - Prisma Client 基础查询

### 为什么学这个
```
前端工程师缺的数据建模能力：
  ❌ 前端：组件状态、Pinia store
  ✅ 后端：数据库设计、关系建模、索引优化

Prisma 的价值：
  - TypeScript 原生，类型安全
  - Migration 自动管理
  - 查询 API 简洁直观
  - 国内大厂（字节、阿里）都在用
```

## 📖 学习材料（30 分钟）

### 必读
1. **Prisma 中文文档：Getting Started with PostgreSQL**（20 分钟）
   - 网址：https://prisma.org.cn/getting-started
   - 重点：理解 schema.prisma 语法
   - 重点：理解 Migration 工作流

2. **文章：「RBAC 权限系统数据建模」**（10 分钟）
   - 搜索关键词：RBAC 数据库设计
   - 重点：理解用户-角色-权限三层关系

### 可选
- Prisma vs TypeORM 对比文章（10 分钟）

## 💻 编码任务（90 分钟）

### 任务 1：数据库准备（15 分钟）

#### 方案 A：本地 Docker 运行 PostgreSQL（推荐）

**前置条件**：
- 已安装 Docker Desktop
- Docker 服务已启动

**启动 PostgreSQL 容器**：

```bash
# 1. 启动 PostgreSQL 16 容器
docker run --name p1-postgres \
  -e POSTGRES_PASSWORD=123456 \
  -e POSTGRES_DB=monitor \
  -p 5432:5432 \
  -d postgres:16

# 2. 验证容器运行
docker ps | grep p1-postgres

# 应该看到：
# CONTAINER ID   IMAGE         ... STATUS         PORTS
# xxxxx          postgres:16   ... Up 5 seconds   0.0.0.0:5432->5432/tcp

# 3. 测试连接（可选）
docker exec -it p1-postgres psql -U postgres -d monitor -c "SELECT version();"

# 应该看到 PostgreSQL 版本信息
```

**连接字符串**：
```
postgresql://postgres:123456@localhost:5432/monitor
```

**常用 Docker 命令**：
```bash
# 停止容器
docker stop p1-postgres

# 启动容器（容器已存在时）
docker start p1-postgres

# 删除容器（需要先停止）
docker rm p1-postgres

# 查看日志
docker logs p1-postgres

# 进入 psql 命令行
docker exec -it p1-postgres psql -U postgres -d monitor
```

#### 方案 B：使用 Supabase（云端，免费）

如果本地 Docker 无法使用，可以选择云端数据库：

```bash
# 1. 访问 https://supabase.com
# 2. 注册账号（用 GitHub 登录）
# 3. 创建新项目
#    - 项目名：p1-monitor
#    - 数据库密码：记住！
#    - Region: Singapore (最近)
# 4. 等待 2 分钟项目创建完成
# 5. 进入项目 → Settings → Database → Connection string
# 6. 复制 URI（选择 Transaction pooler）
```

你会得到类似这样的连接字符串：
```
postgresql://postgres.xxxxx:your-password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

#### 更新 .env

```bash
cd ~/projects/p1-monitor/backend

# 修改 .env，替换 DATABASE_URL
# 使用你刚才拿到的连接字符串
```

---

### 任务 2：安装 Prisma（10 分钟）

```bash
cd ~/projects/p1-monitor/backend

# 安装依赖
pnpm add @prisma/client
pnpm add -D prisma

# 初始化 Prisma
npx prisma init --datasource-provider postgresql

# 你会看到创建了：
# - prisma/schema.prisma（数据模型文件）
# - .env 里自动加了 DATABASE_URL
```

**验证连接**：
```bash
npx prisma db execute --stdin <<< "SELECT 1"

# 如果看到 "Executed successfully"，说明连接成功
```

---

### 任务 3：设计数据模型（30 分钟）

#### 打开 `prisma/schema.prisma`，清空内容，写入：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============ 用户 ============
model User {
  id           String   @id @default(uuid())
  username     String   @unique @db.VarChar(50)
  passwordHash String   @map("password_hash") @db.VarChar(255)
  email        String?  @db.VarChar(100)
  role         String   @default("viewer") @db.VarChar(20)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  conversations Conversation[]

  @@map("users")
}

// ============ 设备 ============
model Server {
  id        String   @id @db.VarChar(50)
  name      String   @db.VarChar(100)
  roomId    String   @map("room_id") @db.VarChar(50)
  type      String   @db.VarChar(50)
  ip        String?  @db.VarChar(50)
  specs     Json?
  status    String   @default("online") @db.VarChar(20)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  metrics   Metric[]
  anomalies Anomaly[]

  @@index([roomId])
  @@index([status])
  @@map("servers")
}

// ============ 指标 ============
model Metric {
  id         BigInt   @id @default(autoincrement())
  serverId   String   @map("server_id") @db.VarChar(50)
  metricType String   @map("metric_type") @db.VarChar(50)
  value      Float    @db.DoublePrecision
  unit       String?  @db.VarChar(20)
  timestamp  DateTime @default(now()) @db.Timestamptz(3)

  server Server @relation(fields: [serverId], references: [id], onDelete: Cascade)

  @@index([serverId, metricType, timestamp(sort: Desc)])
  @@map("metrics")
}

// ============ 异常 ============
model Anomaly {
  id         String   @id @default(uuid())
  serverId   String   @map("server_id") @db.VarChar(50)
  type       String   @db.VarChar(100)
  severity   String   @db.VarChar(20)
  detectedAt DateTime @default(now()) @map("detected_at") @db.Timestamptz(3)
  resolvedAt DateTime? @map("resolved_at") @db.Timestamptz(3)
  status     String   @default("open") @db.VarChar(20)
  rawData    Json     @map("raw_data")
  metadata   Json?

  server    Server     @relation(fields: [serverId], references: [id], onDelete: Cascade)
  diagnosis Diagnosis?

  @@index([serverId, status])
  @@index([status, detectedAt(sort: Desc)])
  @@map("anomalies")
}

// ============ 诊断 ============
model Diagnosis {
  id         String   @id @default(uuid())
  anomalyId  String   @unique @map("anomaly_id")
  steps      Json
  conclusion String   @db.Text
  action     String   @db.VarChar(50)
  durationMs Int      @map("duration_ms")
  model      String   @default("deepseek-chat") @db.VarChar(50)
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(3)

  anomaly   Anomaly    @relation(fields: [anomalyId], references: [id], onDelete: Cascade)
  toolCalls ToolCall[]

  @@map("diagnoses")
}

// ============ 工具调用 ============
model ToolCall {
  id          String   @id @default(uuid())
  diagnosisId String?  @map("diagnosis_id")
  messageId   String?  @map("message_id")
  toolName    String   @map("tool_name") @db.VarChar(100)
  args        Json
  result      Json?
  durationMs  Int?     @map("duration_ms")
  status      String   @db.VarChar(20)
  errorMsg    String?  @map("error_msg") @db.Text
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(3)

  diagnosis Diagnosis? @relation(fields: [diagnosisId], references: [id], onDelete: Cascade)
  message   Message?   @relation(fields: [messageId], references: [id], onDelete: Cascade)

  @@index([toolName])
  @@index([diagnosisId])
  @@map("tool_calls")
}

// ============ 聊天 ============
model Conversation {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  title     String   @default("新对话") @db.VarChar(200)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(3)

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages Message[]

  @@index([userId, updatedAt(sort: Desc)])
  @@map("conversations")
}

model Message {
  id             String   @id @default(uuid())
  conversationId String   @map("conversation_id")
  role           String   @db.VarChar(20)
  content        String   @db.Text
  toolCalls      Json?    @map("tool_calls")
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz(3)

  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  toolCallRecords ToolCall[]

  @@index([conversationId, createdAt])
  @@map("messages")
}
```

#### 理解数据模型（用 Claude Code）

问 Claude Code：
```
请解释这个 schema 中：
1. User 和 Conversation 是什么关系？
2. Server 和 Metric 是什么关系？
3. Anomaly 和 Diagnosis 是什么关系？
4. @@index 有什么作用？
5. onDelete: Cascade 是什么意思？
```

---

### 任务 4：运行数据库迁移（10 分钟）

```bash
# 生成迁移文件并应用
npx prisma migrate dev --name init

# 你会看到：
# ✔ Generated Prisma Client
# ✔ Created 1 migration:
#   migrations/20260618_init/migration.sql
# ✔ Applied migration 20260618_init

# 检查数据库
npx prisma studio

# 会打开浏览器，看到 9 张表的可视化界面
```

**验证成功**：在 Prisma Studio 里能看到所有表。

---

### 任务 5：创建 PrismaService（20 分钟）

#### 创建 Prisma 模块

```bash
cd ~/projects/p1-monitor/backend

# 创建 prisma 模块
nest g module prisma
nest g service prisma
```

#### 编写 PrismaService

修改 `src/prisma/prisma.service.ts`：

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    console.log('✅ Prisma connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

#### 设置为全局模块

修改 `src/prisma/prisma.module.ts`：

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // 关键：全局模块
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

#### 注册到 AppModule

修改 `src/app.module.ts`：

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule, // 加这行
    HealthModule,
  ],
})
export class AppModule {}
```

#### 在 HealthService 中测试

修改 `src/modules/health/health.service.ts`：

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService, // 注入 Prisma
  ) {}

  async getStatus() {
    // 测试数据库连接
    const userCount = await this.prisma.user.count();
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        connected: true,
        userCount,
      },
    };
  }
}
```

**测试**：
```bash
curl http://localhost:3000/api/health

# 应该看到 database.connected: true, userCount: 0
```

---

### 任务 6：编写 Seed 脚本（15 分钟）

创建 `prisma/seed.ts`：

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始种子数据...');

  // 清空旧数据（开发环境可以这样做）
  await prisma.toolCall.deleteMany();
  await prisma.diagnosis.deleteMany();
  await prisma.anomaly.deleteMany();
  await prisma.metric.deleteMany();
  await prisma.server.deleteMany();
  
  // 插入 10 台 mock 服务器
  const servers = [];
  for (let i = 1; i <= 10; i++) {
    const server = await prisma.server.create({
      data: {
        id: `srv-${String(i).padStart(3, '0')}`,
        name: `服务器-${i}`,
        roomId: i <= 5 ? 'room-A' : 'room-B',
        type: 'server',
        ip: `192.168.1.${100 + i}`,
        specs: {
          cpu: 'Intel Xeon E5-2680',
          memory: '128GB',
          disk: '4TB SSD',
        },
        status: 'online',
      },
    });
    servers.push(server);
    console.log(`✅ 创建服务器: ${server.id}`);
  }

  console.log('🎉 种子数据完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

在 `package.json` 添加：

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

安装 ts-node：
```bash
pnpm add -D ts-node
```

运行 seed：
```bash
npx prisma db seed

# 看到：
# ✅ 创建服务器: srv-001
# ✅ 创建服务器: srv-002
# ...
# 🎉 种子数据完成！
```

**验证**：刷新 Prisma Studio，应该看到 servers 表有 10 条数据。

---

## ✅ 验收清单

- [ ] Postgres 连接成功（Supabase 或本地 Docker）
- [ ] `npx prisma migrate dev` 成功创建 9 张表
- [ ] Prisma Studio 能看到所有表
- [ ] PrismaService 全局可注入
- [ ] `/api/health` 返回 `database.connected: true`
- [ ] `npx prisma db seed` 成功插入 10 台服务器
- [ ] Prisma Studio 里 servers 表有 10 条数据
- [ ] git commit 已提交

## 🤔 思考题

1. **Metric 表为什么用 BigInt 做主键？**
   - 时序数据量大，自增 ID 可能用完
   
2. **为什么 Anomaly 和 Diagnosis 是一对一关系？**
   - 能否一对多？有什么场景需要？

3. **@@index([serverId, metricType, timestamp(sort: Desc)]) 的作用？**
   - 为什么要这样建索引？

## 📝 今日总结

**学到了什么**：
- Prisma ORM 基础用法
- 数据库关系建模（一对一 / 一对多）
- Migration 工作流
- Seed 脚本编写

**明天预告**：
- Day 3：模拟数据源 + 定时任务
- 每 5 秒生成模拟指标数据
- 学习 @nestjs/schedule + EventEmitter

---

**Day 2 完成！明天见 🚀**
