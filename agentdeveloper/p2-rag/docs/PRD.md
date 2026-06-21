# P2 RAG Agent 知识库 - 产品需求文档（PRD）

## 📋 文档信息

| 项目 | 信息 |
|------|------|
| **项目名称** | 故障知识库 RAG Agent |
| **项目代号** | P2-RAG |
| **版本** | v1.0 |
| **目标周期** | Day 16-30 |

## 1. 产品定位

### 1.1 一句话描述
基于 P1 监控平台，**集成历史故障知识库**，让 AI Agent 在诊断时自动检索相关案例，提供更准确的解决方案。

### 1.2 核心价值

```
P1 的局限：
  ❌ Agent 每次诊断都"从零开始"
  ❌ 历史经验无法复用
  ❌ 相同问题反复诊断

P2 的提升：
  ✅ 历史故障案例自动入库
  ✅ Agent 诊断时检索相似案例
  ✅ 解决方案可复用
  ✅ 准确率提升 30%+
```

### 1.3 使用场景

#### 场景 1：CPU 突增（已有相似案例）
```
异常发生：srv-001 CPU 95%
  ↓
诊断 Agent 启动
  ↓
1. 调用 getServerHealth → 当前状态
2. 调用 searchKnowledge('CPU 突增') ← 新增！
   → 检索到 3 条历史案例：
     - 案例 1: 2026-05-20 srv-001 CPU 突增，原因是 Java GC，重启解决
     - 案例 2: 2026-04-15 srv-002 CPU 突增，原因是死循环代码
     - 案例 3: 2026-03-10 srv-003 CPU 突增，原因是DDoS 攻击
  ↓
3. Agent 综合分析：「与案例 1 高度相似，建议重启 Java 进程」
  ↓
4. 创建工单 + 推荐解决方案
```

#### 场景 2：罕见问题（无相似案例）
```
异常发生：srv-005 网络抖动
  ↓
检索知识库 → 无相似案例
  ↓
Agent 通用诊断 + 标记为"待人工处理"
  ↓
人工解决后，Agent 自动入库到知识库
  ↓
下次类似问题时可被检索
```

## 2. 功能需求

### 2.1 核心功能清单

| 功能 | 优先级 | 描述 |
|------|-------|------|
| 知识库管理 | P0 | 文档 CRUD + 上传 |
| 自动向量化 | P0 | 文档保存自动 Embedding |
| 语义检索 | P0 | 基于向量相似度 |
| Agent 集成 | P0 | searchKnowledge 工具 |
| 检索结果展示 | P1 | 引用原文 + 跳转 |
| Hybrid Search | P1 | 向量 + 关键词 |
| Reranker | P1 | 二次排序 |
| 用户反馈 | P2 | helpful / not_helpful |
| RAG Eval | P2 | 准确率评估 |

### 2.2 详细设计

#### 2.2.1 知识库管理

**文档类型**：
- 故障案例（fault_case）
- 解决方案（solution）
- 操作指南（guide）
- 标准规范（standard）

**字段设计**：
```typescript
interface KnowledgeDocument {
  id: string;
  title: string;          // 标题
  content: string;        // 正文（Markdown）
  category: string;       // 分类
  tags: string[];         // 标签
  source: string;         // 来源（用户上传/自动生成）
  metadata: {
    severity?: string;    // 严重度
    serverType?: string;  // 设备类型
    resolution?: string;  // 解决方案摘要
    duration?: number;    // 处理耗时
  };
  embedding: number[];    // 向量
  createdAt: Date;
  updatedAt: Date;
}
```

**操作功能**：
- 创建：手动添加 + AI 生成模板
- 编辑：富文本编辑器
- 删除：软删除（保留索引）
- 批量导入：CSV / JSON / Markdown

#### 2.2.2 自动向量化

**触发时机**：
- 创建文档时
- 更新内容时（仅当 content 变化）
- 批量导入时

**Chunking 策略**：
```typescript
// 长文档需要分块
async function chunkDocument(content: string) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,        // 每块 500 字符
    chunkOverlap: 50,      // 重叠 50 字符
    separators: ['\n\n', '\n', '。', '！', '？'],
  });
  
  return splitter.splitText(content);
}
```

**Embedding 模型选择**：
```typescript
// 选项 1：OpenAI（质量最好，要钱）
import { OpenAIEmbeddings } from '@langchain/openai';
const embeddings = new OpenAIEmbeddings({
  modelName: 'text-embedding-3-small', // 1536 维
});

// 选项 2：智源 BGE（开源免费，中文好）
// 需要本地部署 ollama 跑 bge-m3

// 选项 3：阿里通义（国产，便宜）
// dashscope.aliyuncs.com
```

#### 2.2.3 语义检索

**核心算法**：
```sql
-- pgvector 余弦相似度检索
SELECT 
  id, title, content,
  1 - (embedding <=> $1::vector) AS similarity
FROM knowledge_documents
WHERE 1 - (embedding <=> $1::vector) > 0.7
ORDER BY similarity DESC
LIMIT 10;
```

**索引优化**：
```sql
-- IVFFlat 索引（快速近似检索）
CREATE INDEX idx_embedding ON knowledge_documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- HNSW 索引（精度更高，但更慢）
CREATE INDEX idx_embedding_hnsw ON knowledge_documents
USING hnsw (embedding vector_cosine_ops);
```

#### 2.2.4 Agent 集成

**新增工具**：
```typescript
searchKnowledge: tool({
  description: '从故障知识库中检索相关案例和解决方案',
  parameters: z.object({
    query: z.string().describe('检索关键词或问题描述'),
    category: z.enum(['fault_case', 'solution', 'guide']).optional(),
    topK: z.number().default(5).describe('返回前 K 条结果'),
  }),
  execute: async ({ query, category, topK }) => {
    const results = await ragService.search(query, { category, topK });
    return results;
  },
}),
```

**修改诊断 prompt**：
```typescript
const prompt = `
检测到异常：${anomaly.type}

诊断流程：
1. 调用 getServerHealth 查询当前状态
2. 调用 searchKnowledge 检索历史相似案例 ← 新增
3. 综合分析当前状态 + 历史案例
4. 给出诊断结论和处置建议
5. 决定是否创建工单
`;
```

#### 2.2.5 Hybrid Search

**组合策略**：
```typescript
async function hybridSearch(query: string) {
  // 1. 向量检索
  const vectorResults = await vectorSearch(query, 20);
  
  // 2. 全文检索（Postgres FTS）
  const ftsResults = await prisma.$queryRaw`
    SELECT id, ts_rank(to_tsvector(content), plainto_tsquery(${query})) as rank
    FROM knowledge_documents
    WHERE to_tsvector(content) @@ plainto_tsquery(${query})
    ORDER BY rank DESC
    LIMIT 20
  `;
  
  // 3. 加权融合（RRF: Reciprocal Rank Fusion）
  const merged = rrfMerge(vectorResults, ftsResults, {
    vectorWeight: 0.7,
    ftsWeight: 0.3,
  });
  
  return merged.slice(0, 5);
}
```

#### 2.2.6 Reranker

**使用 Cohere Rerank**：
```typescript
import { CohereRerank } from '@langchain/cohere';

const reranker = new CohereRerank({
  apiKey: process.env.COHERE_API_KEY,
  model: 'rerank-multilingual-v3.0',
});

async function rerank(query: string, documents: Document[]) {
  const reranked = await reranker.compressDocuments(documents, query);
  return reranked.slice(0, 3);
}
```

## 3. 性能指标

| 指标 | 目标 |
|------|------|
| 检索延迟 P95 | < 200ms |
| 检索准确率 P@5 | > 80% |
| Embedding 延迟 | < 1s |
| 知识库容量 | 10000+ 文档 |
| 并发检索 | 100 QPS |

## 4. 项目里程碑

| 里程碑 | 时间 | 产出 |
|-------|------|------|
| M1 pgvector 集成 | Day 16-17 | 数据库支持向量检索 |
| M2 LangChain.js 入门 | Day 18 | 基础 RAG Chain |
| M3 知识库 CRUD | Day 19-20 | 文档管理界面 |
| M4 自动向量化 | Day 21-22 | 文档保存自动 Embedding |
| M5 检索优化 | Day 23-25 | Hybrid + Reranker |
| M6 Agent 集成 | Day 26-27 | searchKnowledge 工具 |
| M7 Eval 体系 | Day 28-29 | 准确率评估 |
| M8 上线复盘 | Day 30 | Demo + 简历更新 |

## 5. 验收标准

- [ ] 知识库容量 > 100 篇真实文档
- [ ] 检索准确率 P@5 > 80%
- [ ] Agent 集成 searchKnowledge 工具
- [ ] Hybrid Search + Reranker 全部实现
- [ ] 检索延迟 P95 < 200ms
- [ ] Eval 自动化测试通过

---

**P2 项目让 Agent 拥有"记忆"和"经验"！**
