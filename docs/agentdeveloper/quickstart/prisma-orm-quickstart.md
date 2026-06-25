# Prisma ORM 快速入门（Prisma 7 · 中文教程）

> 写给"前端转后端"的同学：从 0 跑通完整 CRUD + 迁移 + 事务 + 种子的 Prisma 最小可运行教程。所有命令与代码基于 **Prisma ORM 7.x**（Rust-free、ESM-first、driver adapter 必需）的最新稳定写法，不照搬 v5/v6 旧模板。

---

## 📌 版本与适用性（先读）

- 本教程基于 **Prisma ORM 7.x**（2026 年 6 月当前稳定大版本）。
- 先确认你本机版本：

  ```bash
  npx prisma -v
  ```

- ⚠️ 如果你还在 **Prisma 5/6**，下列写法**不完全适用**。v7 的破坏性变化（`prisma-client` generator、`output` 必填、driver adapter 必需、ESM、不再自动 `generate`/`seed`、`.env` 不自动加载）在旧版本上会报错或多余。请对照官方升级指南：https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7
- v7 仍有少量新 API 在不同小版本可能略有差异（如 `prisma.config.ts` 的 `defineConfig`、生成客户端的入口文件名），遇到不一致时**以官方文档和你实际生成的目录为准**。

---

## 0. 全链路一图流

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Prisma 7 全链路                                                         │
│                                                                          │
│  [前置] Node >=20.19  +  Postgres (Docker 一行起库)                       │
│     │                                                                    │
│     ▼                                                                    │
│  [安装] prisma(D) + @prisma/client + @prisma/adapter-pg + dotenv         │
│     │  package.json: "type":"module"                                     │
│     ▼                                                                    │
│  [init] npx prisma init  →  schema.prisma + .env (+ 建议 prisma.config.ts)│
│     │                                                                    │
│     ▼                                                                    │
│  [建模] schema.prisma: datasource / generator(prisma-client+output) /     │
│         model User 1—N Post + @@map + @@index                            │
│     │                                                                    │
│     ▼                                                                    │
│  [迁移] npx prisma migrate dev --name init   →  生成 SQL + 应用到库        │
│     │  ⚠️ v7 不再自动 generate → 手动 npx prisma generate                 │
│     ▼                                                                    │
│  [Client] import { PrismaClient } from './generated/client'              │
│           new PrismaClient({ adapter: new PrismaPg({connectionString}) }) │
│     │                                                                    │
│     ▼                                                                    │
│  [CRUD] create / findUnique / findMany / update / delete                 │
│     │                                                                    │
│     ▼                                                                    │
│  [关系] include 嵌套查询 + 嵌套写入                                       │
│     │                                                                    │
│     ▼                                                                    │
│  [事务] $transaction(数组)   /   $transaction(回调)                      │
│     │                                                                    │
│     ▼                                                                    │
│  [seed] prisma db seed  (package.json prisma.seed 配置)                  │
│     │                                                                    │
│     ▼                                                                    │
│  [Studio] npx prisma studio   可视化查看/编辑数据                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**一句话总结**：Prisma 7 用一份 `schema.prisma` 作为"单一事实源"，通过 `migrate` 生成迁移、`generate` 产出类型安全的 Client，再用 driver adapter 连库做 CRUD，全程类型推断 + 关系查询 + 事务一体化。

---

## ① 前置：Node + Postgres

### Node 版本

⚠️ Prisma 7 要求 **Node >= 20.19.0**（推荐 22.x），TypeScript >= 5.4.0（推荐 5.9.x）。

```bash
node -v
# 预期: v22.x.x
```

✅ 成功标志：版本号 >= 20.19.0。

### Docker 一行起 Postgres

```bash
docker run --name pg-dev -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=blog -p 5432:5432 -d postgres:16
```

✅ 成功标志：

```bash
docker ps | grep pg-dev
# 输出: ... pg-dev ... postgres:16 ... 0.0.0.0:5432->5432/tcp
```

⚠️ 如果本机 5432 已占用，改成 `-p 5433:5432` 并在连接串里用 5433。

---

## ② 安装依赖

```bash
# 初始化项目
mkdir prisma-blog && cd prisma-blog
npm init -y

# CLI 工具（开发依赖）
npm install prisma --save-dev

# 运行时客户端
npm install @prisma/client

# ⚠️ Prisma 7 必装 driver adapter（Postgres 用这个）
npm install @prisma/adapter-pg

# 环境变量加载（v7 不再自动加载 .env）
npm install dotenv
```

✅ 成功标志：`package.json` 的 `dependencies` 出现 `@prisma/client`、`@prisma/adapter-pg`、`dotenv`，`devDependencies` 出现 `prisma`。

### 配置 package.json（v7 是 ESM-first）

```jsonc
{
  "name": "prisma-blog",
  "version": "1.0.0",
  "type": "module",                // ⚠️ 必加，否则 ESM 客户端报错
  "scripts": {
    "dev": "node src/index.js",
    "seed": "node prisma/seed.js"
  }
}
```

⚠️ 如果用 TypeScript：`tsconfig.json` 建议 `module: ESNext`、`moduleResolution: bundler`、`target: ES2023`。

---

## ③ prisma init 初始化

```bash
npx prisma init --datasource-provider postgresql
```

这会生成：
- `prisma/schema.prisma`
- `.env`（写入 `DATABASE_URL` 占位）

### v7 建议：创建 prisma.config.ts

⚠️ v7 把 CLI 配置集中到 `prisma.config.ts`，schema 里的 `url/directUrl/shadowDatabaseUrl` 被废弃。

项目根目录新建 `prisma.config.ts`：

```ts
import 'dotenv/config'  // ⚠️ v7 不再自动加载 .env，必须显式加载
import path from 'node:path'
import { defineConfig } from 'prisma/config'  // 具体导入路径以你所用的 Prisma 版本官方文档为准

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: path.join('prisma', 'migrations'),
})
```

### .env

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/blog
```

✅ 成功标志：`prisma/schema.prisma` 文件存在；`npx prisma validate` 输出 `The schema at prisma/schema.prisma is valid 🚀`。

---

## ④ 定义模型（User + Post 博客场景）

把 `prisma/schema.prisma` 改成：

```prisma
// 数据源：v7 推荐把 url 放 prisma.config.ts，这里保留占位即可
generator client {
  provider = "prisma-client"          // ⚠️ v7 新版 Rust-free 客户端；旧 "prisma-client-js" 已弃用
  output   = "./generated/client"     // ⚠️ v7 必填，不再默认进 node_modules
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?  @map("name")     // 字段级映射: Prisma 字段 name → 列 name
  createdAt DateTime @default(now()) @map("created_at")

  posts Post[]                         // 一对多: 一个用户有多篇文章

  @@map("users")                       // 模型级映射: User → 表 users
  @@index([name])                      // 单字段索引
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  Int      @map("author_id") // 外键字段

  author User @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@map("posts")
  @@index([authorId])                  // 外键索引，加速关系查询
  @@index([published])                 // 常用过滤字段索引
}
```

要点速记：
- `@@map("users")`：模型映射到表名（复数下划线规范）。
- `@map("created_at")`：字段映射到列名（数据库用 snake_case，Prisma 用 camelCase）。
- `@relation(... onDelete: Cascade)`：删除用户时级联删除其文章。
- `@@index([...])`：复合/单字段索引，加快查询。

✅ 成功标志：

```bash
npx prisma validate
# The schema at prisma/schema.prisma is valid 🚀
```

---

## ⑤ migrate dev 生成并应用迁移

```bash
npx prisma migrate dev --name init
```

这会：
1. 在 `prisma/migrations/<时间戳>_init/migration.sql` 生成 SQL。
2. 应用到 `blog` 库（建表 `users` / `posts`）。

✅ 成功标志：

```
✔ Generated Prisma Client to ./prisma/generated/client in 1.2s
✔ Applied migration 20260622000000_init
Your database is now in sync with your schema.
```

⚠️ **v7 破坏性变化**：`migrate dev` 在 v7 之前会自动 `generate` + `seed`，v7 起不再自动执行。如果上面的输出没看到 "Generated Prisma Client"，手动跑：

```bash
npx prisma generate
```

⚠️ `migrate dev` 仅用于开发，**绝不用于生产**（生产用 `migrate deploy`）。它检测到 drift 会提示重置库，可能丢数据。

---

## ⑥ 生成 Prisma Client

每次改 schema 都要重新 generate：

```bash
npx prisma generate
```

✅ 成功标志：

```
✔ Generated Prisma Client (v7.x.x) to ./prisma/generated/client in 1.2s
```

⚠️ v7 不再自动把客户端放进 `node_modules/.prisma/client`，导入路径必须按 `output` 走，即相对 schema 文件的 `./generated/client`（在项目里通常是 `./prisma/generated/client`）。**入口文件名以实际生成的目录为准**（可能是 `client.js`、`index.js` 或其它，先 `ls prisma/generated/client` 看一眼）。

---

## ⑦ CRUD 基础查询

新建 `src/client.js`：

```js
import 'dotenv/config'
import { PrismaClient } from '../prisma/generated/client/client.js'  // ⚠️ 入口文件名以实际生成为准
import { PrismaPg } from '@prisma/adapter-pg'

// ⚠️ v7 必须传入 driver adapter
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
export const prisma = new PrismaClient({ adapter })
```

> 说明：`generated/client` 的入口文件名可能是 `client.js` 或 `index.js`，以你实际生成的目录为准（`ls prisma/generated/client` 看一眼）。下面示例代码都从 `./client.js` 导入 `prisma`。

### 7.1 create（创建）

```js
import { prisma } from './client.js'

const user = await prisma.user.create({
  data: { email: 'alice@prisma.io', name: 'Alice' },
})
console.log(user)
```

预期输出：

```
{ id: 1, email: 'alice@prisma.io', name: 'Alice', createdAt: 2026-06-22T... }
```

### 7.2 findUnique（按唯一键查单条）

```js
const found = await prisma.user.findUnique({
  where: { email: 'alice@prisma.io' },
})
console.log(found)
```

预期输出：

```
{ id: 1, email: 'alice@prisma.io', name: 'Alice', createdAt: 2026-06-22T... }
```

### 7.3 findMany（多条 + 过滤 + 排序 + 分页）

```js
const list = await prisma.user.findMany({
  where: { name: { contains: 'A' } },
  orderBy: { id: 'desc' },
  take: 10,
})
console.log(list)
```

预期输出：

```
[ { id: 1, email: 'alice@prisma.io', name: 'Alice', createdAt: ... } ]
```

### 7.4 update（更新）

```js
const updated = await prisma.user.update({
  where: { id: 1 },
  data: { name: 'Alice Wang' },
})
console.log(updated)
```

预期输出：

```
{ id: 1, email: 'alice@prisma.io', name: 'Alice Wang', createdAt: ... }
```

### 7.5 delete（删除）

```js
const deleted = await prisma.user.delete({ where: { id: 1 } })
console.log(deleted)
```

预期输出（返回被删除的记录）：

```
{ id: 1, email: 'alice@prisma.io', name: 'Alice Wang', createdAt: ... }
```

✅ 成功标志：上面 5 段代码都能 `node src/xxx.js` 跑通且打印符合预期。

---

## ⑧ 关系查询（include / 嵌套写入）

### 8.1 嵌套写入：一次性建用户 + 文章

```js
const u = await prisma.user.create({
  data: {
    email: 'bob@prisma.io',
    name: 'Bob',
    posts: {
      create: [
        { title: 'Hello Prisma',  content: '...', published: true },
        { title: 'N+1 is bad',    content: '...', published: false },
      ],
    },
  },
})
console.log(u)
```

✅ 成功标志：`users` 表 1 条，`posts` 表 2 条，外键 `author_id` 正确指向该用户。

### 8.2 include 预加载关系（解决 N+1）

```js
const withPosts = await prisma.user.findUnique({
  where: { id: u.id },
  include: { posts: true },
})
console.dir(withPosts, { depth: null })
```

预期输出：

```
{
  id: 2,
  email: 'bob@prisma.io',
  name: 'Bob',
  createdAt: ...,
  posts: [
    { id: 1, title: 'Hello Prisma', content: '...', published: true, authorId: 2 },
    { id: 2, title: 'N+1 is bad',   content: '...', published: false, authorId: 2 },
  ]
}
```

### 8.3 嵌套 include + 过滤

```js
const result = await prisma.user.findUnique({
  where: { id: u.id },
  include: {
    posts: {
      where: { published: true },
      orderBy: { id: 'asc' },
      select: { id: true, title: true },
    },
  },
})
console.dir(result, { depth: null })
```

预期输出（只看已发布文章，且只取 id/title）：

```
{ id: 2, email: 'bob@prisma.io', name: 'Bob', createdAt: ...,
  posts: [ { id: 1, title: 'Hello Prisma' } ] }
```

⚠️ `select` 和 `include` 不能在同一查询的**同一层**同时使用（嵌套层级里可分别用）。

---

## ⑨ 事务（$transaction 两种写法）

### 9.1 数组形式（顺序执行，任一失败全部回滚）

```js
const [newUser, newPost] = await prisma.$transaction([
  prisma.user.create({ data: { email: 'carol@prisma.io', name: 'Carol' } }),
  prisma.post.create({
    data: { title: 'Tx Array', author: { connect: { email: 'carol@prisma.io' } } },
  }),
])
console.log(newUser, newPost)
```

✅ 成功标志：两张表都成功插入；若把第二条故意改错（如 `author.connect` 一个不存在的 email），整个事务回滚，用户也不会被插入。

### 9.2 回调/交互式形式（可在事务内写任意逻辑、含原始 SQL）

```js
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: { email: 'dave@prisma.io', name: 'Dave' } })
  await tx.post.create({
    data: { title: 'Tx Callback', author: { connect: { id: user.id } } },
  })
  // 原始 SQL 也能跑
  const rows = await tx.$queryRaw`SELECT count(*)::int AS c FROM "posts"`
  return { userId: user.id, postCount: rows[0].c }
})
console.log(result)
```

预期输出：

```
{ userId: 4, postCount: <当前 posts 总数> }
```

⚠️ `$queryRaw` 用 tagged template 参数化，不要用 `$queryRawUnsafe` 拼接用户输入，否则有 SQL 注入风险。

---

## ⑩ seed 种子脚本

### 新建 `prisma/seed.js`

```js
import 'dotenv/config'
import { PrismaClient } from '../prisma/generated/client/client.js'  // ⚠️ 入口文件名以实际生成为准
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.post.deleteMany()
  await prisma.user.deleteMany()

  const alice = await prisma.user.create({
    data: {
      email: 'alice@prisma.io',
      name: 'Alice',
      posts: { create: [{ title: 'Seed Post 1', published: true }] },
    },
  })
  console.log('Seeded:', alice.email)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
```

### package.json 加配置

⚠️ v7 起 `migrate reset` / `migrate dev` 不再自动 seed，需手动 `prisma db seed`，且 seed 配置在 `package.json` 里：

```jsonc
{
  "name": "prisma-blog",
  "type": "module",
  "prisma": {
    "seed": "node prisma/seed.js"
  },
  "scripts": {
    "dev": "node src/index.js",
    "seed": "node prisma/seed.js"
  }
}
```

### 执行

```bash
npx prisma db seed
```

✅ 成功标志：

```
Running seed command `node prisma/seed.js` ...
Seeded: alice@prisma.io
🌱  The seed command has been executed.
```

---

## ⑪ Prisma Studio 可视化

```bash
npx prisma studio
```

✅ 成功标志：浏览器自动打开 `http://localhost:5555`，左侧列出 `User`、`Post` 两张表，可点进去增删改查。

⚠️ Studio 直接改库不经过迁移，开发调试用；不要在生产库上乱点。

---

## ⑫ 常见错误排查表

| 现象 | 原因 | 解决 |
|---|---|---|
| `Cannot find module './generated/client'` | v7 客户端不再放 `node_modules`，必须按 `output` 路径导入 | 确认 `generator.output` 已设置；按生成目录的实际入口导入 |
| `driver adapter is required` | v7 必须传 driver adapter | 装 `@prisma/adapter-pg` 并 `new PrismaClient({ adapter: new PrismaPg({connectionString}) })` |
| `Environment variable not found: DATABASE_URL` | v7 不再自动加载 `.env` | 代码顶部 `import 'dotenv/config'`；或在 `prisma.config.ts` 顶部加 |
| Client 类型与数据库不符（新增字段查不到、类型报错） | 改了 schema 没重新 generate | `npx prisma migrate dev` 后**手动** `npx prisma generate` |
| `drift detected`，migrate dev 提示重置库 | `db push` 与 `migrate` 混用，或手动改了库结构 | 开发期：`prisma migrate reset`（会清数据）；选定 migrate 后不要再 db push |
| `P1010 Access denied` / SSL 报错 | v7 用 node-pg，自签证书校验更严 | adapter 传 `ssl: { rejectUnauthorized: false }` 或设 `NODE_EXTRA_CA_CERTS` |
| 关系查询外键报错 `Foreign key constraint failed` | 关联字段未正确成对（`authorId` 与 `author @relation`） | 检查 `@relation(fields:[authorId], references:[id])` 与外键字段是否都存在 |
| 循环里查关联，慢得离谱 | N+1 查询 | 改用 `include` 一次性预加载，或 `select` 精简字段 |
| `$queryRawUnsafe` 被注入 | 拼接了用户输入 | 改用 tagged template `` $queryRaw`... ${v} ...` `` |
| CommonJS 项目跑 v7 客户端模块格式错 | v7 默认 ESM | `package.json` 加 `"type": "module"`；或保持 CJS 但调整 tsconfig |
| `enum` TS 值以为是数据库映射值 | `@map` 只在 DB 层生效，TS 仍是 schema 名 | TS 里用 `Status.PENDING`（值 `'PENDING'`），不是映射后的字符串 |
| `migrate dev` 在 CI 上要 shadow database 但权限不足 | 受限权限账号无法建临时库 | 在 `prisma.config.ts` 配 `shadowDatabaseUrl` 指向有权限的库 |

---

## ✅ 完成自检清单

- [ ] `node -v` >= 20.19.0；`docker ps` 能看到 pg 容器在跑
- [ ] `package.json` 已设 `"type": "module"`，装了 `prisma` / `@prisma/client` / `@prisma/adapter-pg` / `dotenv`
- [ ] `prisma/schema.prisma` 含 `generator client { provider="prisma-client"; output="./generated/client" }`
- [ ] `prisma.config.ts` 存在，顶部 `import 'dotenv/config'`
- [ ] `User` 1—N `Post` 模型定义完整，含 `@@map` / `@map` / `@@index`
- [ ] `npx prisma migrate dev --name init` 成功，`prisma/migrations/` 下有迁移文件
- [ ] `npx prisma generate` 成功，`prisma/generated/client/` 目录存在
- [ ] `new PrismaClient({ adapter: new PrismaPg(...) })` 能连库
- [ ] 5 个 CRUD 代码（create/findUnique/findMany/update/delete）都跑通且输出符合预期
- [ ] `include` 嵌套查询 + 嵌套写入都成功
- [ ] `$transaction` 数组与回调两种写法都验证过（含故意失败触发回滚）
- [ ] `prisma db seed` 能播种，`prisma studio` 能可视化查看数据
- [ ] 能说出"开发用 `migrate dev`、生产用 `migrate deploy`、原型用 `db push`，三者不要混用"

---

## 🔗 参考文档（2026-06）

- Prisma 7 升级指南：https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7
- Schema 参考：https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference
- 迁移工作流：https://www.prisma.io/docs/orm/prisma-migrate/workflows
- 原始查询：https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries

---

## 📝 关于本教程

- 与本仓库 [Day 2：Postgres + Prisma + 数据建模](../daily/week1/day02.md) 的关系：本篇是 **Prisma 本体的最小闭环**（纯 Node 脚本，Prisma 7 写法）；Day 2 那篇是把 Prisma 包进 **NestJS**（`PrismaService` + 全局模块 + 注入），属于工程化集成，且那篇的 schema 仍按较传统写法，跑之前请先按本文开头的「版本与适用性」确认你本地的 Prisma 版本。
- 本教程由一个三阶段 workflow 产出：① 调研（确认 Prisma 7 现状）✅ → ② 撰写 ✅ → ③ 校验 ⚠️（中断未完成），后由人工审查把关。v7 仍属较新版本，个别新 API（`prisma.config.ts` 的 `defineConfig`、生成客户端的入口文件名）在不同小版本可能略有差异，遇到不一致请以 `npx prisma -v` 对应版本的官方文档为准。
