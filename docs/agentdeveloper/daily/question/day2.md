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

### 3. 构建和启动时还存在 Prisma client 路径问题

项目使用 Prisma 7，Prisma client 原来生成到：

```text
generated/prisma
```

这个目录在 `src` 外面。Nest 编译到 `dist` 后，运行时会找不到 Prisma client 或 Prisma runtime 文件。

因此需要把 Prisma client 生成到 `src` 内部，并配置 Nest 构建时复制 Prisma runtime。

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
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}
```

作用：让 Prisma client 生成到 `src` 内部，方便 Nest 编译和路径解析。

### 6. 修改 PrismaService 的 PrismaClient 引入路径

修改文件：

```text
src/prisma/prisma.service.ts
```

将原来的引入方式改成：

```ts
import { PrismaClient } from '../generated/prisma';
```

作用：使用新的 Prisma client 生成位置。

### 7. 配置 Nest 构建时复制 Prisma runtime

修改文件：

```text
nest-cli.json
```

新增：

```json
{
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": ["generated/prisma/**/*"],
    "watchAssets": true
  }
}
```

作用：Nest 编译到 `dist` 时，把 `src/generated/prisma` 里的 Prisma runtime 文件也复制过去。

否则启动时可能报错找不到 Prisma 运行时文件。

### 8. 关闭 TypeScript incremental 编译

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

### 9. 添加 Prisma runtime 依赖

执行：

```bash
pnpm add @prisma/client-runtime-utils@7.8.0
```

作用：解决 pnpm 环境下 Prisma runtime 找不到 `@prisma/client-runtime-utils` 的问题。

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
