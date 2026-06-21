# Day 7：JWT 鉴权 + 用户系统

**日期**：Day 7（周日）  
**时长**：6 小时  
**项目**：P1 智能异常监控平台

## 🎯 今日目标

- 实现完整的 JWT 鉴权系统
- 用户注册 / 登录
- 保护所有 API 接口
- WebSocket 鉴权（Day 8 用）

## 📚 学习知识点

### 核心知识点
- **A2. 请求生命周期 - Guards**
  - JwtAuthGuard
  - @UseGuards 装饰器
  - ExecutionContext
  
- **安全基础**
  - JWT 原理
  - bcrypt 密码加密
  - Token 刷新机制

### 为什么学这个
```
真实项目必备：
  ❌ 开发环境：不需要鉴权
  ✅ 生产环境：所有 API 都要鉴权

JWT 的优势：
  - 无状态：不需要 Session 存储
  - 跨域友好：适合前后端分离
  - 可扩展：可携带用户信息
```

## 📖 学习材料（60 分钟）

### 必读
1. **NestJS Authentication 文档**（30 分钟）
   - 网址：https://docs.nestjs.cn/10/security?id=authentication
   - 重点：JwtStrategy 实现
   - 重点：Guards 工作原理

2. **文章：「JWT 最佳实践」**（20 分钟）
   - 搜索关键词：JWT best practices
   - 重点：Access Token / Refresh Token
   - 重点：Token 存储位置

3. **快速预览：bcrypt 用法**（10 分钟）

## 💻 编码任务（300 分钟）

### 任务 1：安装依赖 + 配置（15 分钟）

```bash
cd ~/projects/p1-monitor/backend

pnpm add @nestjs/jwt @nestjs/passport passport-jwt bcryptjs
pnpm add -D @types/passport-jwt @types/bcryptjs
```

更新 `.env`：

```bash
# JWT 配置
JWT_SECRET="your-super-secret-key-change-in-production-min-32-chars"
JWT_EXPIRES_IN="7d"
```

**安全提示**：
- 生产环境的 JWT_SECRET 至少 32 位
- 可以用命令生成：`openssl rand -base64 32`

---

### 任务 2：创建 AuthModule（90 分钟）

```bash
nest g module modules/auth
nest g service modules/auth
nest g controller modules/auth
```

#### 编写 AuthService

修改 `src/modules/auth/auth.service.ts`：

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * 注册
   */
  async register(username: string, password: string, email?: string) {
    // 检查用户名是否已存在
    const existing = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      throw new UnauthorizedException('用户名已存在');
    }

    // 密码加密
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        username,
        passwordHash,
        email,
        role: 'viewer', // 默认角色
      },
    });

    // 生成 Token
    const token = this.generateToken(user.id, user.username);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
    };
  }

  /**
   * 登录
   */
  async login(username: string, password: string) {
    // 查询用户
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 生成 Token
    const token = this.generateToken(user.id, user.username);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
    };
  }

  /**
   * 验证 Token
   */
  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }

  /**
   * 生成 JWT Token
   */
  private generateToken(userId: string, username: string) {
    const payload = { sub: userId, username };
    return this.jwtService.sign(payload);
  }
}
```

#### 编写 AuthController

修改 `src/modules/auth/auth.controller.ts`：

```typescript
import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(
    @Body() body: { username: string; password: string; email?: string },
  ) {
    return this.authService.register(body.username, body.password, body.email);
  }

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    return this.authService.login(body.username, body.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard) // 需要登录
  async getProfile(@Request() req) {
    return req.user;
  }
}
```

#### 配置 AuthModule

修改 `src/modules/auth/auth.module.ts`：

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN', '7d'),
        },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

---

### 任务 3：实现 JwtStrategy + Guard（60 分钟）

#### 创建 JwtStrategy

创建 `src/modules/auth/strategies/jwt.strategy.ts`：

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // payload 是 JWT 解码后的数据 { sub: userId, username: ... }
    return this.authService.validateUser(payload.sub);
  }
}
```

#### 创建 JwtAuthGuard

创建 `src/modules/auth/guards/jwt-auth.guard.ts`：

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 检查是否有 @Public() 装饰器
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );

    if (isPublic) {
      return true; // 公开接口，不需要鉴权
    }

    return super.canActivate(context);
  }
}
```

#### 创建 @Public 装饰器（可选）

创建 `src/modules/auth/decorators/public.decorator.ts`：

```typescript
import { SetMetadata } from '@nestjs/common';

export const Public = () => SetMetadata('isPublic', true);
```

#### 创建 @CurrentUser 装饰器

创建 `src/modules/auth/decorators/current-user.decorator.ts`：

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

---

### 任务 4：保护 API 接口（60 分钟）

#### 方法 1：全局启用鉴权（推荐）

修改 `src/main.ts`：

```typescript
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局启用 JWT 鉴权
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  await app.listen(3000);
}
bootstrap();
```

#### 标记公开接口

修改不需要鉴权的接口，添加 @Public()：

```typescript
// health.controller.ts
import { Public } from '../auth/decorators/public.decorator';

@Controller('api/health')
export class HealthController {
  @Get()
  @Public() // 公开接口
  async check() {
    return this.healthService.getStatus();
  }
}

// auth.controller.ts
@Controller('api/auth')
export class AuthController {
  @Post('register')
  @Public() // 注册接口公开
  async register(...) { ... }

  @Post('login')
  @Public() // 登录接口公开
  async login(...) { ... }
}
```

#### 测试鉴权

```bash
# 1. 未登录访问受保护接口 → 401
curl http://localhost:3000/api/anomalies
# {"statusCode":401,"message":"Unauthorized"}

# 2. 注册用户
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'

# 返回：
# {
#   "user": { "id": "xxx", "username": "admin", ... },
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# }

# 3. 用 Token 访问 → 成功
curl http://localhost:3000/api/anomalies \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 4. 获取当前用户信息
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 任务 5：使用 @CurrentUser 装饰器（30 分钟）

修改需要用户信息的接口：

```typescript
// anomaly-detector.controller.ts
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/anomalies')
export class AnomalyDetectorController {
  @Get()
  async list(
    @CurrentUser() user: any, // 自动注入当前用户
    @Query('status') status?: string,
  ) {
    console.log('当前用户:', user); // { id, username, role }
    
    return this.prisma.anomaly.findMany({
      where: { ...(status && { status }) },
      orderBy: { detectedAt: 'desc' },
    });
  }
}
```

---

### 任务 6：角色权限控制（可选，45 分钟）

#### 创建 @Roles 装饰器

创建 `src/modules/auth/decorators/roles.decorator.ts`：

```typescript
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

#### 创建 RolesGuard

创建 `src/modules/auth/guards/roles.guard.ts`：

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    if (!requiredRoles) {
      return true; // 没有角色要求
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return requiredRoles.includes(user.role);
  }
}
```

#### 使用示例

```typescript
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('api/anomalies')
export class AnomalyDetectorController {
  @Patch(':id/resolve')
  @Roles('admin', 'operator') // 只有 admin 和 operator 可以标记为已解决
  @UseGuards(RolesGuard)
  async resolve(@Param('id') id: string) {
    return this.prisma.anomaly.update({
      where: { id },
      data: { status: 'resolved', resolvedAt: new Date() },
    });
  }
}
```

---

## ✅ 验收清单

- [ ] 用户注册 / 登录接口正常工作
- [ ] 未登录访问受保护接口返回 401
- [ ] 携带 Token 访问受保护接口成功
- [ ] `/api/auth/me` 能返回当前用户信息
- [ ] @CurrentUser 装饰器能获取用户信息
- [ ] @Public 装饰器能标记公开接口
- [ ] 密码已加密存储（Prisma Studio 查看）
- [ ] git commit 已提交

## 🤔 思考题

1. **JWT 的三部分是什么？**
   - Header / Payload / Signature

2. **为什么密码要用 bcrypt 而不是 MD5？**
   - bcrypt 有 salt，防彩虹表攻击

3. **Access Token 和 Refresh Token 的区别？**
   - Access Token 短期（如 15 分钟）
   - Refresh Token 长期（如 7 天），用于刷新 Access Token

4. **JwtStrategy.validate() 什么时候被调用？**
   - 每次请求带 Token，Guard 会先验证 Token，再调用 validate

## 💡 扩展挑战（可选）

### 挑战 1：实现 Refresh Token

```typescript
// 注册/登录时同时返回 Access Token 和 Refresh Token
async login(username: string, password: string) {
  // ... 验证用户

  const accessToken = this.generateToken(user.id, user.username, '15m');
  const refreshToken = this.generateToken(user.id, user.username, '7d');

  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 分钟
  };
}

// 刷新 Token 接口
@Post('refresh')
@Public()
async refresh(@Body() body: { refreshToken: string }) {
  // 验证 Refresh Token
  const payload = this.jwtService.verify(body.refreshToken);
  
  // 生成新的 Access Token
  const newAccessToken = this.generateToken(payload.sub, payload.username, '15m');
  
  return { accessToken: newAccessToken };
}
```

### 挑战 2：Token 黑名单（登出）

使用 Redis 存储已登出的 Token：

```typescript
@Post('logout')
async logout(@CurrentUser() user: any, @Headers('authorization') auth: string) {
  const token = auth.replace('Bearer ', '');
  
  // 存入 Redis 黑名单（过期时间 = Token 过期时间）
  await this.redis.set(`blacklist:${token}`, '1', 'EX', 86400);
  
  return { message: '已登出' };
}
```

## 📝 今日总结

**学到了什么**：
- JWT 原理与实现
- NestJS Guards 机制
- Passport.js 集成
- 装饰器的高级用法

**Week 1 总结**：
- Day 1-2: 后端架构 + 数据库 ✅
- Day 3: 事件驱动 + 定时任务 ✅
- Day 4: 异常检测 ✅
- Day 5: Tool Calling ✅
- Day 6: Multi-step Agent ✅
- Day 7: JWT 鉴权 ✅

**下周预告（Day 8-14）**：
- Day 8: WebSocket + Echarts 实时大盘
- Day 9: 异常列表 + 诊断详情 UI
- Day 10: Chat 浮层
- Day 11: Swagger + 单元测试
- Day 12-13: 性能优化 + 工具调用统计
- Day 14: Docker 部署上线

---

**Week 1 完成！🎉 恭喜你完成了 P1 项目的核心功能！**
