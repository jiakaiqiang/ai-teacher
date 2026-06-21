# Day 6：Multi-step Agent + 事件驱动诊断

**日期**：Day 6（周六）  
**时长**：6 小时  
**项目**：P1 智能异常监控平台

## 🎯 今日目标

- 实现 Multi-step Agent（核心）
- 监听 anomaly.detected 事件自动诊断
- 诊断记录持久化
- 完整跑通异常 → 诊断闭环

## 📚 学习知识点

### 核心知识点
- **C3. Multi-step Agent**
  - maxSteps 参数
  - onStepFinish 回调
  - tool-call / tool-result 事件流
  
- **C4. 事件驱动的 Agent 触发**
  - 用户主动触发（Chat）
  - 事件触发（异常检测后）
  - 后台异步执行

### 为什么这是最重要的一天
```
前 5 天的积累在今天汇聚：
  Day 1-2: 后端架构 + 数据库
  Day 3:   事件驱动 + 定时任务
  Day 4:   异常检测
  Day 5:   Tool Calling

Day 6: 让 Agent 自主完成 5 步诊断！
  异常发生 → Agent 被唤醒 → 5 步工具调用 → 诊断报告 → 持久化
```

## 📖 学习材料（60 分钟）

### 必读
1. **Vercel AI SDK：Multi-step Agents**（30 分钟）
   - 网址：https://sdk.vercel.ai/docs/ai-sdk-core/agents
   - 重点：maxSteps 如何工作
   - 重点：onStepFinish 回调

2. **文章：「AI Agent 的思考过程可视化」**（20 分钟）
   - 搜索关键词：Agent thinking process visualization
   - 参考：Claude Code 的 thinking 时间线

3. **复习 Day 4 的异常检测逻辑**（10 分钟）

## 💻 编码任务（300 分钟）

### 任务 1：监听异常事件 + 自动诊断（90 分钟）

这是今天最核心的任务！

#### 在 AgentService 添加诊断方法

修改 `src/modules/agent/agent.service.ts`：

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, CoreMessage } from 'ai';
import { createTools } from './tools';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly deepseek;
  private readonly tools;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.deepseek = createOpenAICompatible({
      name: 'deepseek',
      apiKey: this.configService.get('DEEPSEEK_API_KEY')!,
      baseURL: 'https://api.deepseek.com',
    });
    this.tools = createTools(prisma);
  }

  /**
   * 监听 anomaly.detected 事件，自动诊断
   */
  @OnEvent('anomaly.detected')
  async handleAnomaly(anomaly: any) {
    this.logger.log(`🤖 Agent 开始诊断异常: ${anomaly.id}`);

    const startTime = Date.now();
    const stepsLog: any[] = [];

    try {
      // 更新异常状态为 "诊断中"
      await this.prisma.anomaly.update({
        where: { id: anomaly.id },
        data: { status: 'diagnosing' },
      });

      // 构建诊断 prompt
      const prompt = `检测到异常，请诊断并给出处置建议：

**异常信息**
- 服务器：${anomaly.serverId}
- 类型：${anomaly.type}
- 严重度：${anomaly.severity}
- 检测时间：${anomaly.detectedAt}
- 原始数据：${JSON.stringify(anomaly.rawData)}

**诊断流程**
请按以下步骤完成诊断：
1. 调用 getServerHealth 查询服务器当前状态
2. 调用 getMetricHistory 查看过去 30 分钟的趋势
3. 调用 queryHistoricalAnomalies 查找历史相似案例
4. 综合分析，生成诊断报告（Markdown 格式）
5. 根据严重度决定：
   - critical/high: 调用 createTicket 创建工单
   - medium: 记录日志即可
   - low: 忽略

**输出格式**
请用 Markdown 格式输出完整诊断报告，包含：
## 异常诊断报告
### 当前状态
### 历史趋势
### 相似案例
### 诊断结论
### 处置建议`;

      // 调用 Agent（关键：maxSteps + onStepFinish）
      const result = await generateText({
        model: this.deepseek('deepseek-chat'),
        messages: [{ role: 'user', content: prompt }],
        system: '你是工业异常诊断专家，擅长分析设备异常并给出处置建议。',
        tools: this.tools,
        maxSteps: 10, // 允许多步推理
        onStepFinish: ({ toolCalls, toolResults, text }) => {
          // 记录每一步（重要！）
          stepsLog.push({
            timestamp: Date.now(),
            toolCalls: toolCalls?.map((tc) => ({
              toolName: tc.toolName,
              args: tc.args,
            })),
            toolResults: toolResults?.map((tr) => ({
              result: tr.result,
            })),
            text,
          });

          this.logger.debug(
            `Step ${stepsLog.length}: ${toolCalls?.length || 0} tool calls`,
          );
        },
      });

      const durationMs = Date.now() - startTime;

      // 判断处置动作（从诊断文本中提取）
      const action = this.extractAction(result.text);

      // 持久化诊断记录
      const diagnosis = await this.prisma.diagnosis.create({
        data: {
          anomalyId: anomaly.id,
          steps: stepsLog,
          conclusion: result.text,
          action,
          durationMs,
          model: 'deepseek-chat',
        },
      });

      // 更新异常状态为 "已解决"
      await this.prisma.anomaly.update({
        where: { id: anomaly.id },
        data: { status: 'resolved' },
      });

      this.logger.log(
        `✅ 诊断完成: ${anomaly.id}, 耗时 ${durationMs}ms, ${stepsLog.length} 步`,
      );

      return diagnosis;
    } catch (error) {
      this.logger.error(`❌ 诊断失败: ${anomaly.id}`, error);

      // 诊断失败，更新状态为 "open"
      await this.prisma.anomaly.update({
        where: { id: anomaly.id },
        data: { status: 'open' },
      });

      throw error;
    }
  }

  /**
   * 从诊断文本中提取处置动作
   */
  private extractAction(text: string): string {
    if (text.includes('创建工单') || text.includes('create_ticket')) {
      return 'create_ticket';
    }
    if (text.includes('通知') || text.includes('notify')) {
      return 'notify';
    }
    if (text.includes('忽略') || text.includes('ignore')) {
      return 'ignore';
    }
    return 'log_only';
  }

  // ... 前面的 chat 方法保持不变
}
```

#### 理解 onStepFinish（关键！）

用 Claude Code 理解：
```
请解释 onStepFinish 回调的执行时机：
1. 什么时候被调用？
2. 为什么要记录 stepsLog？
3. 如果不记录会怎样？
```

---

### 任务 2：测试自动诊断（60 分钟）

#### 方法 1：手动触发异常

```bash
# 触发一个异常
curl http://localhost:3000/api/metrics/anomaly/srv-001
```

**观察后端日志**，应该看到：
```
[AnomalyDetectorService] 🚨 检测到异常: srv-001 - cpu_spike (critical)
[AgentService] 🤖 Agent 开始诊断异常: xxx-xxx-xxx
[AgentService] Step 1: 1 tool calls
[AgentService] Step 2: 1 tool calls
[AgentService] Step 3: 1 tool calls
[AgentService] ✅ 诊断完成: xxx-xxx-xxx, 耗时 8234ms, 4 步
```

#### 方法 2：查看诊断记录

```bash
# 查询异常列表
curl http://localhost:3000/api/anomalies

# 拿到异常 ID，查询详情（含诊断）
curl http://localhost:3000/api/anomalies/{异常ID}

# 应该看到 diagnosis 字段
```

#### 验证数据库

打开 Prisma Studio：
- `anomalies` 表：status 从 "open" → "diagnosing" → "resolved"
- `diagnoses` 表：有新记录，conclusion 是完整的 Markdown 报告
- `tool_calls` 表：记录了每次工具调用

---

### 任务 3：诊断详情 API（30 分钟）

用户需要查看 Agent 的完整诊断过程。

在 `anomaly-detector.controller.ts` 添加：

```typescript
/**
 * 查询诊断详情
 */
@Get(':id/diagnosis')
async getDiagnosis(@Param('id') id: string) {
  const diagnosis = await this.prisma.diagnosis.findUnique({
    where: { anomalyId: id },
    include: {
      anomaly: {
        include: { server: true },
      },
      toolCalls: true, // 关联所有工具调用
    },
  });

  if (!diagnosis) {
    return { error: '未找到诊断记录' };
  }

  return {
    anomaly: {
      id: diagnosis.anomaly.id,
      serverId: diagnosis.anomaly.serverId,
      serverName: diagnosis.anomaly.server.name,
      type: diagnosis.anomaly.type,
      severity: diagnosis.anomaly.severity,
      detectedAt: diagnosis.anomaly.detectedAt,
    },
    diagnosis: {
      id: diagnosis.id,
      conclusion: diagnosis.conclusion,
      action: diagnosis.action,
      durationMs: diagnosis.durationMs,
      steps: diagnosis.steps,
      createdAt: diagnosis.createdAt,
    },
    toolCalls: diagnosis.toolCalls.map((tc) => ({
      toolName: tc.toolName,
      args: tc.args,
      result: tc.result,
      durationMs: tc.durationMs,
      status: tc.status,
      createdAt: tc.createdAt,
    })),
  };
}
```

**测试**：
```bash
curl http://localhost:3000/api/anomalies/{异常ID}/diagnosis
```

应该返回完整的诊断详情，包含：
- 异常信息
- 诊断结论（Markdown）
- 每一步的工具调用记录

---

### 任务 4：综合测试场景（60 分钟）

#### 场景 1：CPU 突增异常

```bash
# 1. 触发异常
curl http://localhost:3000/api/metrics/anomaly/srv-002

# 2. 等待 10-15 秒，Agent 自动诊断

# 3. 查询异常列表
curl http://localhost:3000/api/anomalies?status=resolved

# 4. 查询诊断详情
curl http://localhost:3000/api/anomalies/{异常ID}/diagnosis
```

**验收标准**：
- Agent 调用了 ≥ 3 个工具
- 诊断报告格式清晰（Markdown）
- 耗时 < 30s

#### 场景 2：多个异常并发

```bash
# 同时触发 3 个异常
curl http://localhost:3000/api/metrics/anomaly/srv-001 &
curl http://localhost:3000/api/metrics/anomaly/srv-002 &
curl http://localhost:3000/api/metrics/anomaly/srv-003 &
```

**验收标准**：
- 3 个 Agent 并发执行
- 都能成功完成诊断
- 数据库记录正确

#### 场景 3：Agent 决策测试

修改 `metrics.service.ts`，生成不同严重度的异常：

```typescript
// 生成 low 严重度异常
async generateLowAnomaly(serverId: string) {
  const metrics = [{
    serverId,
    metricType: 'cpu',
    value: 82, // 刚过阈值
    unit: '%',
  }];
  await this.prisma.metric.createMany({ data: metrics });
  this.eventEmitter.emit('metric.created', metrics);
}

// 生成 critical 严重度异常
async generateCriticalAnomaly(serverId: string) {
  const metrics = [{
    serverId,
    metricType: 'cpu',
    value: 99, // 非常高
    unit: '%',
  }];
  await this.prisma.metric.createMany({ data: metrics });
  this.eventEmitter.emit('metric.created', metrics);
}
```

测试 Agent 是否会：
- low 严重度 → action: 'log_only'
- critical 严重度 → action: 'create_ticket'（并真的调用 createTicket 工具）

---

### 任务 5：优化与调试（60 分钟）

#### 优化 1：并发控制

如果异常很多，Agent 并发执行可能导致 API 超限。

在 `agent.service.ts` 添加：

```typescript
private diagnosisQueue: Array<{ anomaly: any; resolve: Function; reject: Function }> = [];
private isProcessing = false;

@OnEvent('anomaly.detected')
async handleAnomalyQueued(anomaly: any) {
  // 加入队列
  return new Promise((resolve, reject) => {
    this.diagnosisQueue.push({ anomaly, resolve, reject });
    this.processQueue();
  });
}

private async processQueue() {
  if (this.isProcessing || this.diagnosisQueue.length === 0) return;

  this.isProcessing = true;
  const { anomaly, resolve, reject } = this.diagnosisQueue.shift()!;

  try {
    const result = await this.handleAnomaly(anomaly);
    resolve(result);
  } catch (error) {
    reject(error);
  } finally {
    this.isProcessing = false;
    this.processQueue(); // 处理下一个
  }
}
```

#### 优化 2：超时保护

```typescript
// 在 generateText 外层加超时
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('诊断超时')), 60000), // 60s 超时
);

const result = await Promise.race([
  generateText({ ... }),
  timeoutPromise,
]);
```

#### 调试技巧

如果 Agent 不调用工具：
1. 检查 prompt 是否清晰
2. 检查 tool description 是否写了
3. 尝试更明确的指令："请调用 getServerHealth 工具"

如果工具调用失败：
1. 检查 Prisma 查询是否有数据
2. 检查 serverId 是否正确
3. 看 tool-result 的 error 信息

---

## ✅ 验收清单

- [ ] 触发异常后，Agent 自动诊断（无需人工）
- [ ] Agent 调用了 ≥ 3 个工具
- [ ] 诊断耗时 < 30s（P95）
- [ ] 诊断报告是 Markdown 格式
- [ ] 数据库 diagnoses 表有记录
- [ ] steps 字段包含完整的工具调用过程
- [ ] `/api/anomalies/{id}/diagnosis` 能返回详情
- [ ] 并发测试通过（3 个异常同时诊断）
- [ ] git commit 已提交

## 🤔 思考题

1. **onStepFinish 和 result.steps 有什么区别？**
   - 一个是实时回调，一个是最终结果

2. **如果 Agent 陷入无限循环怎么办？**
   - maxSteps 的保护机制

3. **为什么要持久化 steps？**
   - 用户需要看 Agent 的思考过程
   - 调试 Agent 行为
   - 后续优化 prompt

## 💡 扩展挑战（可选）

### 挑战 1：Agent 自我反思

在诊断最后，让 Agent 反思诊断质量：
```typescript
const reflection = await generateText({
  model: this.deepseek('deepseek-chat'),
  messages: [
    { role: 'user', content: `请评价这次诊断的质量：\n${result.text}` },
  ],
});
```

### 挑战 2：多轮对话诊断

如果第一次诊断不确定，Agent 可以：
1. 调用更多工具
2. 查询更长时间范围的数据
3. 咨询人工（发通知）

## 📝 今日总结

**学到了什么**：
- Multi-step Agent 实现
- 事件驱动的 Agent 触发
- onStepFinish 回调机制
- 诊断记录持久化

**明天预告**：
- Day 7：JWT 鉴权 + 用户系统
- 会话管理
- 消息持久化

---

**Day 6 完成！Week 1 最重要的一天 🎉**
