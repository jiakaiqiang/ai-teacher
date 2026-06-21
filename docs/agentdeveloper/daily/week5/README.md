# Week 5 (Day 31-37)：P3 启动 - LangGraph 入门

## 📅 本周目标

启动 P3 项目，掌握 LangGraph.js 状态机，实现 4 个 Agent 的基础版本。

## 📊 每日计划

### Day 31（周一）· 2 小时：P3 启动 + LangGraph 入门

**学习重点**：
- LangGraph.js 核心概念
- StateGraph
- Nodes & Edges

**编码任务**：
```typescript
import { StateGraph, END } from '@langchain/langgraph';

interface State {
  input: string;
  output: string;
}

const workflow = new StateGraph<State>({
  channels: { input: null, output: null },
});

workflow.addNode('process', async (state) => {
  return { output: `处理: ${state.input}` };
});

workflow.addEdge('process', END);
workflow.setEntryPoint('process');

const app = workflow.compile();
const result = await app.invoke({ input: 'hello' });
```

**产出**：
- [ ] LangGraph.js 安装
- [ ] 第一个状态机跑通
- [ ] 理解 StateGraph 概念

---

### Day 32（周二）· 2 小时：监测 Agent

**任务**：
- 基于 P1 检测引擎升级
- 智能噪音过滤
- 异常严重度评估

**核心代码**：
```typescript
const monitorAgent = async (state: WorkflowState) => {
  const anomaly = state.anomaly;
  
  // 1. 智能过滤
  const isNoise = await checkNoise(anomaly);
  if (isNoise) {
    return { ...state, status: 'filtered' };
  }
  
  // 2. 严重度评估
  const severity = await assessSeverity(anomaly);
  
  return {
    ...state,
    anomaly: { ...anomaly, severity },
    status: 'monitored',
  };
};
```

**产出**：
- [ ] 监测 Agent 实现
- [ ] 噪音过滤准确率 > 90%
- [ ] 单元测试通过

---

### Day 33（周三）· 2 小时：诊断 Agent（升级版）

**任务**：
- 集成 P2 的 RAG
- 根因分析逻辑
- 自动修复决策

**核心代码**：
```typescript
const diagnoseAgent = async (state: WorkflowState) => {
  // 1. 获取当前状态
  const health = await getServerHealth(state.anomaly.serverId);
  
  // 2. RAG 检索
  const cases = await searchKnowledge(state.anomaly.type);
  
  // 3. LLM 综合分析
  const result = await generateText({
    model: deepseek('deepseek-chat'),
    messages: buildDiagnosisPrompt(state.anomaly, health, cases),
  });
  
  // 4. 解析诊断结果
  const diagnosis = parseDiagnosis(result.text);
  
  return {
    ...state,
    diagnosis,
    status: 'diagnosed',
  };
};
```

**产出**：
- [ ] 诊断 Agent 实现
- [ ] RAG 集成测试通过
- [ ] 决策逻辑正确

---

### Day 34（周四）· 2 小时：修复 Agent

**任务**：
- 实现 5 类修复操作
- SSH 服务封装
- 安全机制

**核心代码**：
```typescript
const repairAgent = async (state: WorkflowState) => {
  const action = state.diagnosis.suggestedActions[0];
  
  // 1. 风险评估
  const risk = assessRisk(action);
  
  // 2. 高风险需要确认
  if (risk === 'high') {
    return {
      ...state,
      status: 'pending_approval',
      pendingAction: action,
    };
  }
  
  // 3. 执行修复
  const result = await executeRepair(action);
  
  // 4. 记录
  await saveRepairAction(action, result);
  
  return {
    ...state,
    repairResult: result,
    status: 'repaired',
  };
};
```

**产出**：
- [ ] 5 类修复操作实现
- [ ] SSH 模拟服务
- [ ] 安全机制可用

---

### Day 35（周五）· 2 小时：验证 Agent

**任务**：
- 修复后验证逻辑
- 持续观察 5 分钟
- 给出验证报告

**核心代码**：
```typescript
const verifyAgent = async (state: WorkflowState) => {
  await sleep(30000); // 等待稳定
  
  // 持续观察 5 分钟
  for (let i = 0; i < 10; i++) {
    await sleep(30000);
    
    const metric = await getLatestMetric(state.anomaly.serverId);
    
    if (!isNormal(metric)) {
      return {
        ...state,
        verifyResult: {
          success: false,
          reason: `第 ${i+1} 次检查异常`,
        },
        status: 'failed',
      };
    }
  }
  
  return {
    ...state,
    verifyResult: { success: true },
    status: 'completed',
  };
};
```

**产出**：
- [ ] 验证 Agent 实现
- [ ] 完整闭环测试
- [ ] 验证准确率 > 95%

---

### Day 36（周六）· 6 小时：LangGraph 工作流编排

**任务**：
- 完整的 StateGraph
- 条件边（Conditional Edges）
- 状态持久化

**核心代码**：
```typescript
const workflow = new StateGraph<WorkflowState>({
  channels: { /* ... */ },
});

// 添加节点
workflow.addNode('monitor', monitorAgent);
workflow.addNode('diagnose', diagnoseAgent);
workflow.addNode('repair', repairAgent);
workflow.addNode('verify', verifyAgent);
workflow.addNode('createTicket', createTicketNode);

// 入口
workflow.setEntryPoint('monitor');

// 边
workflow.addEdge('monitor', 'diagnose');

// 条件边
workflow.addConditionalEdges('diagnose', (state) => {
  return state.diagnosis.canAutoFix ? 'repair' : 'createTicket';
});

workflow.addEdge('repair', 'verify');
workflow.addEdge('verify', END);
workflow.addEdge('createTicket', END);

// 编译
const app = workflow.compile({
  checkpointer: new PostgresCheckpointer(prisma), // 状态持久化
});
```

**产出**：
- [ ] 完整工作流跑通
- [ ] 状态持久化可用
- [ ] 端到端测试通过

---

### Day 37（周日）· 6 小时：Human-in-the-loop

**任务**：
- 高风险操作人工确认
- 工作流暂停与恢复
- 通知机制

**核心代码**：
```typescript
// 暂停工作流等待人工确认
workflow.addNode('humanApproval', async (state) => {
  // 发送通知
  await notifyOperator({
    workflowId: state.id,
    action: state.pendingAction,
    risk: 'high',
  });
  
  // interrupt 暂停
  return interrupt('等待人工确认');
});

// 人工响应后恢复
async function approveAction(workflowId: string, approved: boolean) {
  await app.updateState(workflowId, { approved });
  await app.resume(workflowId);
}
```

**产出**：
- [ ] Human-in-loop 机制可用
- [ ] 工作流可暂停恢复
- [ ] 通知系统集成
- [ ] Week 5 复盘

---

## ✅ Week 5 验收清单

- [ ] LangGraph.js 完全掌握
- [ ] 4 个 Agent 全部实现
- [ ] StateGraph 工作流跑通
- [ ] 状态持久化可用
- [ ] Human-in-loop 机制可用
- [ ] 端到端测试通过

## 🚀 下周预告

**Week 6（Day 38-45）**：P3 完成 + Eval 体系
- Day 38-39：Eval 自动化测试
- Day 40-41：性能优化
- Day 42-43：监控大盘
- Day 44-45：上线 + 复盘

---

**Week 5 完成！🎉**
