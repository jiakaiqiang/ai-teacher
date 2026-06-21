# Week 3 (Day 15-21)：P2 项目启动 - RAG 基础

## 📅 本周目标

完成 P1 复盘，启动 P2 RAG Agent 项目，掌握 pgvector 和 LangChain.js 基础。

## 📊 每日计划概览

### Day 15（周一）· 2 小时：P1 复盘 + P2 启动

**任务**：
- P1 项目复盘（写技术博客）
- 简历更新（加入 P1 项目）
- P2 项目初始化
- 阅读 P2 PRD

**产出**：
- [ ] 技术博客 1 篇（P1 复盘）
- [ ] 简历更新完成
- [ ] P2 项目目录创建

---

### Day 16（周二）· 2 小时：pgvector 安装与配置

**学习重点**：
- pgvector 扩展安装
- 向量数据类型
- 相似度计算（余弦/欧氏）

**编码任务**：
```bash
# 1. 在 Postgres 启用 pgvector
CREATE EXTENSION IF NOT EXISTS vector;

# 2. 修改 schema.prisma 添加向量字段
model KnowledgeDocument {
  id        String @id @default(uuid())
  title     String
  content   String @db.Text
  embedding Unsupported("vector(1536)")?
  // ...
}

# 3. 生成迁移
npx prisma migrate dev --name add_pgvector
```

**产出**：
- [ ] pgvector 扩展启用
- [ ] knowledge_documents 表创建
- [ ] 测试向量插入与检索

---

### Day 17（周三）· 2 小时：LangChain.js 入门

**学习重点**：
- LangChain.js 核心概念
- Document Loader
- Text Splitter
- Embeddings

**编码任务**：
```typescript
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

// 1. 文档分块
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50,
});

const chunks = await splitter.splitText(longText);

// 2. 向量化
const embeddings = new OpenAIEmbeddings();
const vectors = await embeddings.embedDocuments(chunks);
```

**产出**：
- [ ] LangChain.js 安装
- [ ] 第一个 Embedding 跑通
- [ ] 理解 chunking 策略

---

### Day 18（周四）· 2 小时：知识库 CRUD 后端

**编码任务**：
- KnowledgeModule 创建
- 文档 CRUD API
- 自动向量化（保存时触发）

**核心代码**：
```typescript
@Injectable()
export class KnowledgeService {
  async create(dto: CreateDocDto) {
    // 1. 保存文档
    const doc = await this.prisma.knowledgeDocument.create({ data: dto });
    
    // 2. 异步向量化
    this.embedAndSave(doc.id, doc.content);
    
    return doc;
  }

  async embedAndSave(id: string, content: string) {
    const embedding = await this.embeddings.embedQuery(content);
    
    await this.prisma.$executeRaw`
      UPDATE knowledge_documents 
      SET embedding = ${embedding}::vector 
      WHERE id = ${id}
    `;
  }
}
```

**产出**：
- [ ] 文档 CRUD API
- [ ] 自动向量化跑通
- [ ] Postman 测试通过

---

### Day 19（周五）· 2 小时：向量检索实现

**编码任务**：
- 实现语义检索
- 返回相似度得分
- 阈值过滤

**核心代码**：
```typescript
async search(query: string, topK = 5) {
  // 1. 查询向量化
  const queryEmbedding = await this.embeddings.embedQuery(query);
  
  // 2. 向量检索
  const results = await this.prisma.$queryRaw<any[]>`
    SELECT 
      id, title, content,
      1 - (embedding <=> ${queryEmbedding}::vector) AS similarity
    FROM knowledge_documents
    WHERE 1 - (embedding <=> ${queryEmbedding}::vector) > 0.7
    ORDER BY similarity DESC
    LIMIT ${topK}
  `;
  
  return results;
}
```

**产出**：
- [ ] 语义检索 API
- [ ] 测试 10+ 查询案例
- [ ] 检索准确率初步评估

---

### Day 20（周六）· 6 小时：知识库管理界面

**编码任务**：
- 文档列表页
- 文档编辑器（Markdown）
- 批量上传功能
- 检索测试页面

**前端组件**：
```vue
<!-- KnowledgeList.vue -->
<template>
  <div>
    <ElTable :data="documents">
      <ElTableColumn prop="title" label="标题" />
      <ElTableColumn prop="category" label="分类" />
      <ElTableColumn label="操作">
        <template #default="{ row }">
          <ElButton @click="edit(row)">编辑</ElButton>
          <ElButton @click="del(row.id)">删除</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
    
    <KnowledgeEditor v-model:visible="editorVisible" :doc="currentDoc" />
  </div>
</template>
```

**产出**：
- [ ] 列表页可用
- [ ] 编辑器可用
- [ ] 批量导入功能
- [ ] 上传 50+ 真实文档测试

---

### Day 21（周日）· 6 小时：Hybrid Search + Reranker

**编码任务**：
- 实现 Hybrid Search（向量 + 全文）
- 集成 Cohere Rerank
- 准确率对比测试

**核心代码**：
```typescript
async hybridSearch(query: string) {
  // 1. 并行检索
  const [vectorResults, ftsResults] = await Promise.all([
    this.vectorSearch(query, 20),
    this.ftsSearch(query, 20),
  ]);
  
  // 2. RRF 融合
  const merged = this.rrfMerge(vectorResults, ftsResults);
  
  // 3. Rerank
  const reranked = await this.rerank(query, merged.slice(0, 10));
  
  return reranked.slice(0, 5);
}
```

**产出**：
- [ ] Hybrid Search 实现
- [ ] Reranker 集成
- [ ] 准确率提升数据
- [ ] Week 3 复盘

---

## ✅ Week 3 验收清单

- [ ] pgvector 扩展启用并测试
- [ ] 知识库 CRUD 完整可用
- [ ] 自动向量化跑通
- [ ] 语义检索准确率 > 70%
- [ ] Hybrid Search 提升 5-10% 准确率
- [ ] Reranker 进一步提升 5-10%
- [ ] 100+ 真实文档入库
- [ ] git commit ≥ 50 次

## 📊 Week 3 学到的能力

- LangChain.js 基础使用
- pgvector 向量数据库
- Embedding 模型选择
- Chunking 策略
- 语义检索
- Hybrid Search（RRF 算法）
- Reranker 集成

## 🚀 下周预告

**Week 4（Day 22-30）**：Agent 集成 + 评估体系
- Day 22-23：searchKnowledge 工具集成
- Day 24-25：诊断 Agent 升级（带 RAG）
- Day 26-27：RAG Eval 体系
- Day 28-29：性能优化
- Day 30：P2 上线 + 复盘

---

**Week 3 完成！🎉**
