# Week 4 (Day 22-30)：P2 完成 - Agent 集成与上线

## 📅 本周目标

完成 P2 项目，包括 Agent 集成、Eval 体系、性能优化、上线运营。

## 📊 每日计划概览

### Day 22（周一）· 2 小时：searchKnowledge 工具

**任务**：
- 在 P1 工具集中新增 searchKnowledge
- 修改诊断 Agent 的 prompt
- 测试 RAG 增强诊断效果

**核心代码**：
```typescript
// 在 createTools 中新增
searchKnowledge: tool({
  description: '从故障知识库检索相关案例',
  parameters: z.object({
    query: z.string(),
    topK: z.number().default(5),
  }),
  execute: async ({ query, topK }) => {
    return ragService.hybridSearch(query, { topK });
  },
}),
```

**产出**：
- [ ] searchKnowledge 工具实现
- [ ] Agent 集成测试通过
- [ ] 5 个对比测试（带 RAG vs 不带 RAG）

---

### Day 23（周二）· 2 小时：诊断 prompt 优化

**任务**：
- 优化诊断 Agent 的 system prompt
- 引导 Agent 主动调用 RAG
- 引用原文展示

**优化后的 prompt**：
```typescript
const prompt = `
你是工业异常诊断专家。

诊断流程：
1. 调用 getServerHealth 查询当前状态
2. 调用 getMetricHistory 查看趋势
3. 【重要】调用 searchKnowledge 检索历史相似案例
4. 综合分析当前状态 + 历史案例
5. 给出诊断结论（必须引用知识库案例）
6. 决定处置方式

输出格式：
## 诊断报告
### 当前状态
### 历史趋势
### 相似案例
- 引用案例 1（链接到原文）
- 引用案例 2
### 诊断结论
### 处置建议
`;
```

**产出**：
- [ ] Prompt 优化完成
- [ ] Agent 100% 调用 RAG
- [ ] 引用原文展示

---

### Day 24（周三）· 2 小时：RAG Eval 体系

**任务**：
- 设计评估数据集
- 实现自动化评估脚本
- 计算关键指标

**评估指标**：
```typescript
interface RAGEvalMetrics {
  precision_at_k: number;    // P@K：Top K 中相关文档比例
  recall_at_k: number;       // R@K：相关文档被检索到的比例
  mrr: number;               // 平均倒数排名
  hit_rate: number;          // 命中率
}
```

**评估脚本**：
```typescript
async function evaluateRAG(testCases: TestCase[]) {
  const results = await Promise.all(
    testCases.map(async (tc) => {
      const retrieved = await ragService.search(tc.query);
      const relevant = tc.expectedDocIds;
      
      return {
        precision: calculatePrecision(retrieved, relevant),
        recall: calculateRecall(retrieved, relevant),
        mrr: calculateMRR(retrieved, relevant),
      };
    })
  );
  
  return aggregateMetrics(results);
}
```

**产出**：
- [ ] 评估数据集 50 条
- [ ] 评估脚本可运行
- [ ] P@5 > 80%

---

### Day 25（周四）· 2 小时：用户反馈循环

**任务**：
- 检索结果展示反馈按钮
- 用户反馈数据入库
- 反馈数据分析

**前端**：
```vue
<div class="search-result">
  <h3>{{ result.title }}</h3>
  <p>{{ result.content }}</p>
  
  <div class="feedback">
    这个结果有帮助吗？
    <ElButton @click="feedback(result.id, 'helpful')">👍</ElButton>
    <ElButton @click="feedback(result.id, 'not_helpful')">👎</ElButton>
  </div>
</div>
```

**产出**：
- [ ] 反馈按钮可用
- [ ] 反馈数据入库
- [ ] 反馈统计大盘

---

### Day 26（周五）· 2 小时：性能优化

**任务**：
- Embedding 缓存（Redis）
- 检索结果缓存
- 数据库索引优化

**优化策略**：
```typescript
// 1. Embedding 缓存
async embed(text: string) {
  const cacheKey = `embedding:${md5(text)}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const embedding = await this.embeddings.embedQuery(text);
  await redis.setex(cacheKey, 86400, JSON.stringify(embedding));
  return embedding;
}

// 2. pgvector 索引优化
CREATE INDEX idx_embedding_hnsw 
ON knowledge_documents 
USING hnsw (embedding vector_cosine_ops);
```

**产出**：
- [ ] 检索延迟 P95 < 200ms
- [ ] Embedding 缓存命中率 > 50%
- [ ] 性能数据对比报告

---

### Day 27（周六）· 6 小时：知识图谱可视化

**任务**：
- 文档关系分析
- Echarts 关系图展示
- 检索结果联动

**核心实现**：
```typescript
// 1. 计算文档相似度矩阵
async function buildKnowledgeGraph() {
  const docs = await prisma.knowledgeDocument.findMany();
  const nodes = docs.map(d => ({ id: d.id, name: d.title }));
  const links = [];
  
  // 计算文档之间的相似度
  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      const similarity = cosineSimilarity(
        docs[i].embedding,
        docs[j].embedding
      );
      
      if (similarity > 0.7) {
        links.push({
          source: docs[i].id,
          target: docs[j].id,
          value: similarity,
        });
      }
    }
  }
  
  return { nodes, links };
}
```

**产出**：
- [ ] 知识图谱可视化
- [ ] 节点点击查看详情
- [ ] 检索结果在图谱高亮

---

### Day 28（周日）· 6 小时：综合测试 + Bug 修复

**任务**：
- 端到端测试
- 真实用户测试
- Bug 修复

**测试场景**：
```
场景 1：故障案例入库
  - 上传 100+ 真实文档
  - 验证向量化成功
  - 验证检索准确

场景 2：Agent + RAG 诊断
  - 触发 10 个不同异常
  - Agent 都调用 RAG
  - 诊断质量明显提升

场景 3：用户反馈循环
  - 测试反馈按钮
  - 数据正确入库
  - 统计大盘正确
```

**产出**：
- [ ] 所有测试通过
- [ ] 修复 5+ Bug
- [ ] 邀请 3-5 个用户试用

---

### Day 29（周日）· 6 小时：Docker 部署 + 监控

**任务**：
- 更新 docker-compose
- 添加 Redis（缓存）
- 部署到生产环境

**docker-compose.yml 更新**：
```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16  # 使用预装 pgvector 的镜像
    
  redis:
    image: redis:7-alpine
  
  backend:
    # 已有配置
    
  frontend:
    # 已有配置
```

**产出**：
- [ ] 公网 HTTPS 部署
- [ ] 全部功能正常
- [ ] Sentry 错误监控接入

---

### Day 30（周日）· 6 小时：P2 复盘 + 简历更新

**任务**：
- 录 Demo 视频
- 写技术博客
- 更新简历
- 准备第一次跳槽

**博客主题**：
1. 「从 0 到 1：用 LangChain.js 构建生产级 RAG 系统」
2. 「pgvector 实战：百万级文档的向量检索优化」
3. 「Agent + RAG：让 AI 真正"懂"你的业务」

**简历更新**：
```markdown
## 项目经验

### 故障知识库 RAG Agent（个人项目，Day 16-30）
**技术栈**：Vue 3 + NestJS + Postgres(pgvector) + LangChain.js + DeepSeek

**核心功能**：
- 知识库管理：100+ 真实工业文档
- 自动向量化：BGE-M3 / OpenAI Embedding
- Hybrid Search：向量 + 全文检索 + RRF 融合
- Reranker：Cohere Rerank 二次排序
- Agent 集成：searchKnowledge 工具
- 知识图谱：Echarts 关系图可视化

**技术亮点**：
- pgvector + HNSW 索引，检索延迟 < 100ms
- Hybrid Search 准确率提升 30%
- Reranker 进一步提升 15%
- Embedding 缓存命中率 > 50%
- 完整 RAG Eval 体系（P@5 > 85%）
```

**产出**：
- [ ] Demo 视频（5 分钟）
- [ ] 3 篇技术博客
- [ ] 简历更新完成
- [ ] **P2 项目完成！**

---

## ✅ Week 4 验收清单

- [ ] searchKnowledge 工具集成完成
- [ ] Agent + RAG 诊断质量提升明显
- [ ] RAG Eval 自动化测试通过（P@5 > 85%）
- [ ] 用户反馈循环可用
- [ ] 性能优化达标（< 200ms）
- [ ] 知识图谱可视化
- [ ] 公网部署成功
- [ ] 30 天总结博客发布

## 📊 Week 4 学到的能力

- Agent 与 RAG 集成
- Prompt 工程（引导 Agent 行为）
- RAG Eval 体系设计
- 用户反馈循环
- 性能优化（缓存策略）
- 知识图谱构建
- 生产级部署

## 💼 跳槽准备（Day 30）

**简历投递清单**：
- Boss 直聘：30 个目标公司
- 拉勾：20 个目标公司
- 猎聘：10 个目标公司

**目标岗位**：
- Node 全栈工程师（AI 方向）
- 初级 AI 应用工程师
- RAG 应用开发工程师

**预期薪资**：35-42K（涨幅 40-50%）

---

**P2 项目完成！🎉 进入 P3 多 Agent 系统！**
