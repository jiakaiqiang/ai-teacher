# AI前端导师 - Phase 2 扩展计划

## 🎯 Phase 2：AI Agent & 应用开发（Week 7-10，可选）

### 前置条件
- 完成Phase 1（Week 1-6）
- lighthouse-ai-analyzer已上线
- 掌握基础AI集成

---

## Week 7：AI Agent基础

### Day 43-45：LangChain.js入门

**学习目标：**
- 理解Agent的核心概念
- 掌握LangChain.js基础用法
- 能创建简单的Agent

**学习内容：**
1. LangChain.js官方文档
2. Agent vs Chain vs Tool
3. Memory管理

**实战任务：**
创建第一个AI Agent：智能助手
```typescript
import { OpenAI } from "langchain/llms/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { Calculator } from "langchain/tools/calculator";
import { WebBrowser } from "langchain/tools/webbrowser";

const tools = [new Calculator(), new WebBrowser()];

const agent = await initializeAgentExecutorWithOptions(
  tools,
  new OpenAI({ temperature: 0 }),
  {
    agentType: "zero-shot-react-description",
  }
);

// Agent可以自主选择工具完成任务
const result = await agent.run(
  "2024年的GDP是多少？然后计算它的20%"
);
```

**检查标准：**
- [ ] Agent能正确选择和使用工具
- [ ] 能处理多步推理
- [ ] 有完整的日志记录

---

### Day 46-49：构建完整的AI Agent

**项目：AI代码审查Agent**

**功能：**
1. 自主读取代码文件
2. 分析代码质量
3. 搜索最佳实践
4. 生成详细报告
5. 提出改进建议（带代码）

**技术栈：**
- LangChain.js
- OpenAI GPT-4
- Custom Tools（文件读取、代码分析）
- Vector Store（知识库）

**架构：**
```typescript
const codeReviewAgent = {
  // 工具集
  tools: [
    readFileTool,      // 读取代码
    searchDocsTool,    // 搜索文档
    analyzeCodeTool,   // 静态分析
    checkSecurityTool, // 安全检查
  ],
  
  // Agent配置
  agent: createReActAgent({
    llm: new ChatOpenAI({ model: "gpt-4" }),
    tools,
    prompt: codeReviewPrompt,
  }),
  
  // Memory
  memory: new BufferMemory({
    returnMessages: true,
    memoryKey: "chat_history",
  }),
};
```

---

## Week 8：RAG应用开发

### Day 50-52：RAG基础

**学习目标：**
- 理解RAG（检索增强生成）
- 掌握向量数据库
- 实现基础RAG流程

**学习内容：**
1. Embedding原理
2. 向量数据库（Pinecone/Weaviate）
3. Semantic Search

**实战任务：**
创建技术文档问答系统
```typescript
// 1. 文档切片 + Embedding
const docs = await loadDocs('./docs');
const chunks = await splitDocuments(docs);
const vectorStore = await Pinecone.fromDocuments(
  chunks,
  new OpenAIEmbeddings()
);

// 2. 检索相关文档
const retriever = vectorStore.asRetriever();
const relevantDocs = await retriever.getRelevantDocuments(
  "如何优化React性能？"
);

// 3. 生成回答
const chain = RetrievalQAChain.fromLLM(
  new ChatOpenAI(),
  retriever
);

const answer = await chain.call({
  query: "如何优化React性能？",
});
```

---

### Day 53-56：构建完整RAG应用

**项目：AI技术顾问**

**功能：**
1. 上传技术文档/代码
2. 自动Embedding并存储
3. 智能问答（带引用来源）
4. 多轮对话（保持上下文）
5. 生成技术方案

**技术亮点：**
- Hybrid Search（向量+关键词）
- Re-ranking（重排序提升准确度）
- Streaming输出
- 引用来源追踪

---

## Week 9：Multi-Agent系统

### Day 57-59：Multi-Agent基础

**学习目标：**
- 多个Agent协同工作
- Agent间通信
- 任务分配和编排

**实战任务：**
创建3个协同的Agent：
```typescript
const researchAgent = createAgent({
  name: "研究员",
  role: "搜索和整理信息",
  tools: [webSearchTool, readDocTool],
});

const writerAgent = createAgent({
  name: "写作者",
  role: "根据研究结果撰写文章",
  tools: [writeTool, editTool],
});

const reviewerAgent = createAgent({
  name: "审核者",
  role: "审查内容质量",
  tools: [grammarCheckTool, factCheckTool],
});

// 编排工作流
const workflow = new AgentWorkflow([
  { agent: researchAgent, task: "研究主题" },
  { agent: writerAgent, task: "撰写文章" },
  { agent: reviewerAgent, task: "审核质量" },
]);
```

---

### Day 60-63：构建Multi-Agent应用

**项目：AI内容创作平台**

**功能：**
1. 用户输入主题
2. Research Agent搜集资料
3. Outline Agent生成大纲
4. Writer Agent撰写内容
5. Editor Agent润色修改
6. SEO Agent优化关键词
7. 输出高质量文章

**技术难点：**
- Agent间状态共享
- 错误重试机制
- 人类反馈循环（Human-in-the-loop）

---

## Week 10：AI应用架构

### Day 64-66：AI应用最佳实践

**学习内容：**
1. AI应用架构模式
2. Token成本优化
3. 速度优化（Streaming、Cache）
4. 可观测性（Logging、Tracing）
5. 安全性（防Prompt注入）

**实战：**
优化之前的AI项目
- 添加Prompt缓存（减少50%成本）
- 实现Streaming（提升体验）
- 添加LangSmith监控
- 实现Rate Limiting

---

### Day 67-70：综合项目

**终极项目：AI全栈应用**

二选一：

**选项A：AI编程助手**
- 理解需求 → 生成代码 → 运行测试 → 修复Bug
- 技术：Multi-Agent + RAG + Code Execution

**选项B：AI客服系统**
- 智能问答 + 工单创建 + 情感分析 + 人工转接
- 技术：RAG + Agent + Function Calling

**要求：**
- 完整的前后端
- 生产级代码质量
- 部署上线
- 有真实用户使用

---

## 🎯 Phase 2学习成果

完成后你将掌握：

### 技术能力
- ✅ LangChain.js深度应用
- ✅ Agent开发（单Agent + Multi-Agent）
- ✅ RAG应用开发
- ✅ 向量数据库使用
- ✅ AI应用架构设计
- ✅ Token成本优化
- ✅ 生产环境部署

### 项目成果
- ✅ AI代码审查Agent
- ✅ AI技术顾问（RAG）
- ✅ AI内容创作平台（Multi-Agent）
- ✅ AI全栈应用（综合项目）

### 市场价值
- 💼 AI应用开发工程师
- 💼 AI Agent架构师
- 💰 薪资范围：50-80万
- 🚀 稀缺度：⭐⭐⭐⭐⭐

---

## 📊 能力对比

| 维度 | Phase 1完成后 | Phase 2完成后 |
|------|---------------|---------------|
| AI集成 | ✅ 基础API调用 | ✅ Agent开发 |
| 应用复杂度 | ⭐⭐⭐ 单一功能 | ⭐⭐⭐⭐⭐ 复杂系统 |
| 市场竞争力 | 中高级前端 | AI应用架构师 |
| 薪资范围 | 35-50万 | 50-80万 |
| 稀缺度 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🤔 是否需要Phase 2？

### 建议做Phase 2的情况：
- ✅ 想深入AI方向
- ✅ 目标是AI应用开发
- ✅ 有10周时间投入
- ✅ 想拿50万+薪资

### 可以跳过Phase 2的情况：
- ⚠️ 只想快速找工作
- ⚠️ 时间有限（<6周）
- ⚠️ 只想补AI基础
- ⚠️ 不想做AI方向

---

## 💡 我的建议

基于你的情况（5年经验+性能优化专长）：

**建议路径：**
1. **先完成Phase 1（6周）**
   - 补齐AI基础短板
   - 有完整项目作品
   - 简历焕然一新

2. **评估后决定是否Phase 2**
   - 如果Phase 1后就有好offer → 先上车
   - 如果想深入AI方向 → 继续Phase 2
   - 如果时间充裕 → Phase 2性价比很高

**最优方案：**
- Phase 1（6周）→ 拿offer入职 → 边工作边学Phase 2
- 这样既有收入，又能持续提升

---

想要我把Phase 2也整合进AI导师系统吗？
包括：
- 详细的每日计划
- 自动推送和检查
- 进度追踪
