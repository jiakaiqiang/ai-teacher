# Day 2 问题记录：`/api/health` 无法访问

## 问题现象

执行下面命令时无法正常访问健康检查接口：

```bash
curl http://localhost:3000/api/health
```

期望结果是返回服务健康状态，例如：

```json
{
  "status": "ok",
  "database": {
    "connected": true,
    "userCount": 0
  }
}
```

## 主要原因

### 1. `HealthModule` 只有 Service，没有 Controller

项目中已经有：

```text
src/modules/health/health.module.ts
src/modules/health/health.service.ts
```

但是没有 `HealthController`，所以 Nest 没有注册任何 HTTP 路由。

也就是说，即使有 `HealthService.getStatus()` 方法，浏览器或 `curl` 也访问不到它，因为缺少类似下面的控制器：

```ts
@Controller('health')
export class HealthController {
  @Get()
  getStatus() {
    return this.healthService.getStatus();
  }
}
```

### 2. 访问路径是 `/api/health`，但项目原来没有设置 `/api` 前缀

原来的 `main.ts` 中只启动了 Nest 应用：

```ts
const app = await NestFactory.create(AppModule);
await app.listen(process.env.PORT ?? 3000);
```

没有设置：

```ts
app.setGlobalPrefix('api');
```

所以项目即使注册了 `health` 路由，默认路径也会是：

```text
/health
```

而不是：

```text
/api/health
```

### 3. 构建和启动时还存在 Prisma 7 client 配置问题

项目使用 Prisma 7，Prisma client 原来生成到：

```text
generated/prisma
```

这个目录在 `src` 外面。Nest 编译到 `dist` 后，运行时会找不到生成出来的 Prisma client。

同时，Prisma 7 的写法已经不再推荐 `prisma-client-js` 和 `@prisma/client` 默认导入：

- generator 应该使用 `provider = "prisma-client"`，并显式配置 `output`。
- `datasource.url` 应该放到 `prisma.config.ts`，不要继续写在 `schema.prisma` 里。
- PostgreSQL 运行时需要使用 driver adapter，例如 `@prisma/adapter-pg`。

## 修改方案

### 1. 新增 `HealthController`

新增文件：

```text
src/modules/health/health.controller.ts
```

内容：

```ts
import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getStatus() {
    return this.healthService.getStatus();
  }
}
```

作用：把 `HealthService.getStatus()` 暴露成 HTTP GET 接口。

最终路由会变成：

```text
GET /api/health
```

### 2. 在 `HealthModule` 注册 Controller

修改文件：

```text
src/modules/health/health.module.ts
```

修改后：

```ts
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
```

作用：让 Nest 知道 `HealthController` 属于 `HealthModule`，从而注册路由。

### 3. 在 `AppModule` 引入 `HealthModule`

修改文件：

```text
src/app.module.ts
```

关键修改：

```ts
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [PrismaModule, HealthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

作用：把健康检查模块挂到主模块上。

如果模块没有被 `AppModule` 或其他上级模块 import，Nest 不会加载它。

### 4. 设置全局 API 前缀

修改文件：

```text
src/main.ts
```

新增：

```ts
app.setGlobalPrefix('api');
```

修改后：

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

作用：让所有 controller 路由统一加上 `/api` 前缀。

所以：

```ts
@Controller('health')
```

最终访问路径就是：

```text
/api/health
```

### 5. 调整 Prisma client 生成目录

修改文件：

```text
prisma/schema.prisma
```

将 Prisma client 输出目录改成：

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
}
```

作用：使用 Prisma 7 的新 generator，并让 Prisma client 生成到 `src` 内部，方便 Nest 编译和路径解析。

注意：Prisma 7 的 `schema.prisma` 里不再写：

```prisma
url = env("DATABASE_URL")
```

数据库连接地址放到根目录的 `prisma.config.ts`。

### 6. 新增或更新 `prisma.config.ts`

修改文件：

```text
prisma.config.ts
```

内容：

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

作用：Prisma CLI 从这里读取 schema、migration、seed 和数据库连接地址。

### 7. 修改 PrismaService 的 PrismaClient 引入和初始化方式

修改文件：

```text
src/prisma/prisma.service.ts
```

将原来的 `@prisma/client` 默认导入改成生成目录导入，并传入 PostgreSQL adapter：

```ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('Prisma connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

作用：使用 Prisma 7 生成的新 client，并让运行时通过 `@prisma/adapter-pg` 连接 PostgreSQL。

### 8. 安装 Prisma 7 运行依赖

执行：

```bash
pnpm add @prisma/client@7 @prisma/adapter-pg pg dotenv
pnpm add -D prisma@7 tsx
```

作用：安装 Prisma 7 client、PostgreSQL driver adapter、`pg` 驱动和 seed 运行器。

### 9. 移除旧的 runtime 复制和额外 runtime 依赖

下面这些旧处理不再作为 Prisma 7 推荐写法：

```text
provider = "prisma-client-js"
import { PrismaClient } from '@prisma/client'
pnpm add @prisma/client-runtime-utils@7.8.0
```

使用 `provider = "prisma-client"` 并把输出目录放到 `src/generated/prisma` 后，Nest 会把被引用的生成代码一起编译。通常不需要再通过 `nest-cli.json` 复制 `generated/prisma/**/*`，也不需要手动添加 `@prisma/client-runtime-utils`。

如果项目仍保留了下面这段 assets 配置，可以删除：

```json
{
  "compilerOptions": {
    "assets": ["generated/prisma/**/*"],
    "watchAssets": true
  }
}
```

### 10. 关闭 TypeScript incremental 编译

修改文件：

```text
tsconfig.json
```

将：

```json
"incremental": true
```

改成：

```json
"incremental": false
```

作用：避免增量缓存导致 `pnpm build` 显示成功，但 `dist/main.js` 没有正常生成。

## 验证方式

### 1. 构建项目

```bash
pnpm build
```

构建通过说明 TypeScript、Nest 和 Prisma client 生成都正常。

### 2. 启动服务

```bash
pnpm start:prod
```

启动日志中可以看到类似信息：

```text
Mapped {/api/health, GET} route
Prisma connected
Nest application successfully started
```

### 3. 请求接口

```bash
curl http://localhost:3000/api/health
```

实际验证返回：

```json
{
  "status": "ok",
  "timestamp": "2026-06-24T11:15:47.156Z",
  "uptime": 119.8136216,
  "database": {
    "connected": true,
    "userCount": 0
  }
}
```

## 关于 `nest g module health` 创建目录的问题

在当前 Nest 项目中，`nest-cli.json` 的 `sourceRoot` 是：

```json
"sourceRoot": "src"
```

所以执行：

```bash
nest g module health
```

默认会基于 `src` 创建模块，通常生成到：

```text
src/health
```

如果希望生成到当前项目的模块目录：

```text
src/modules/health
```

应该执行：

```bash
nest g module modules/health
```

对应 controller 和 service 也可以这样生成：

```bash
nest g controller modules/health
nest g service modules/health
```

## 总结

这次 `/api/health` 访问失败，最核心的原因是：

1. 没有 `HealthController`，所以没有 HTTP 路由。
2. 没有设置 `app.setGlobalPrefix('api')`，所以 `/api` 前缀不存在。
3. Prisma client 生成目录和 Nest 编译输出目录不匹配，导致运行时可能找不到 Prisma 文件。

修复后，健康检查接口已经可以通过下面地址访问：

```text
http://localhost:3000/api/health
```
