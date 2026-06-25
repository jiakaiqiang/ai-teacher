# Prisma 建表过程记录

## 目标

运行 Prisma 命令，将后端项目中的 Prisma 模型同步到 PostgreSQL 数据库中并创建表。

## 执行过程

1. 检查后端项目结构，确认存在 `prisma/`、`package.json`、`prisma.config.ts` 和 `.env.example`。

2. 查看 Prisma 配置文件：
   - `prisma/schema.prisma`
   - `prisma/models/*.prisma`
   - `prisma.config.ts`
   - `package.json`

3. 确认 Prisma schema 由 `prisma/schema.prisma` 和 `prisma/models/*.prisma` 组成，模型文件中定义了业务表。

4. 检查 `.env.example`，发现示例数据库连接串为：

   ```text
   postgresql://postgres:postgres@localhost:5432/p1_monitor?schema=public
   ```

5. 检查本机 PostgreSQL 端口，确认 `localhost:5432` 可连接。

6. 执行依赖安装：

   ```powershell
   pnpm install --frozen-lockfile
   ```

7. pnpm 阻止了 Prisma 相关依赖的 build scripts，因此执行：

   ```powershell
   pnpm approve-builds --all
   ```

   该操作让 `pnpm-workspace.yaml` 中加入了：

   ```yaml
   allowBuilds:
     '@prisma/engines': true
     prisma: true
     unrs-resolver: true
   ```

8. 处理 Node.js 版本问题：
   - 原始版本为 `v23.11.1`，Prisma 7 不支持。
   - 尝试 `v22.12.0`，但 pnpm 11 要求至少 `v22.13`。
   - 最终安装并切换到 `Node v22.13.0`。

9. 使用 Corepack 准备 `pnpm@11.8.0`，并通过 pnpm 的 `pnpm.mjs` 入口继续执行命令。

10. 验证 Prisma schema：

    ```powershell
    $env:DATABASE_URL='postgresql://postgres:postgres@localhost:5432/p1_monitor?schema=public'
    pnpm prisma validate
    ```

    验证结果通过：

    ```text
    The schemas at prisma are valid
    ```

11. 第一次执行 `prisma db push` 时，使用 `.env.example` 中的密码 `postgres`，数据库返回认证失败：

    ```text
    P1000: Authentication failed
    ```

12. 检查 Docker 容器，发现 PostgreSQL 来自容器：

    ```text
    learnbyagent-db
    ```

    容器环境变量显示真实数据库配置为：

    ```text
    POSTGRES_PASSWORD=123456
    POSTGRES_DB=learnbyagent
    ```

13. 因为项目需要连接 `p1_monitor` 数据库，而容器中没有该数据库，所以执行：

    ```sql
    CREATE DATABASE p1_monitor;
    ```

14. 使用正确的数据库密码执行 Prisma 建表：

    ```powershell
    $env:DATABASE_URL='postgresql://postgres:123456@localhost:5432/p1_monitor?schema=public'
    pnpm prisma db push
    ```

    执行成功：

    ```text
    Your database is now in sync with your Prisma schema.
    ```

15. 查询 PostgreSQL 表列表，确认创建了 8 张表：

    ```text
    anomalies
    conversations
    diagnoses
    messages
    metrics
    servers
    tool_calls
    users
    ```

## 最终结果

Prisma schema 已成功同步到 PostgreSQL 数据库 `p1_monitor`，业务表已经创建完成。

## 注意事项

当前项目没有 `.env` 文件，后续运行后端时应使用正确的数据库连接串：

```text
DATABASE_URL="postgresql://postgres:123456@localhost:5432/p1_monitor?schema=public"
```

本次过程中产生的工作区改动包括：

```text
M pnpm-workspace.yaml
M ../../package.json
```

其中：

- `pnpm-workspace.yaml` 是允许 Prisma 相关依赖构建脚本导致的。
- `../../package.json` 是 Corepack 添加 `packageManager` 字段导致的。
