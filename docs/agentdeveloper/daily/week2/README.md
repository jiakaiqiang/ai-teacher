# Day 9-14 快速计划概览

由于文档生成数量较大，我为 Day 9-14 创建简化版计划。如需详细版，可单独展开。

## Day 9（周二晚）· 2 小时：异常列表 + 诊断详情 UI

**目标**
- 实现异常列表页面（实时更新）
- 点击异常查看诊断详情
- Agent 思考过程时间线展示

**核心任务**
```vue
// AnomalyList.vue
- 表格展示异常列表
- 状态实时更新（WebSocket）
- 严重度颜色标记
- 点击跳转详情

// DiagnosisDetail.vue
- Agent 思考过程时间线
- 工具调用可折叠展开
- Markdown 渲染诊断报告
```

**验收**
- [ ] 异常列表实时更新
- [ ] 诊断详情完整展示
- [ ] 时间线 UI 美观（参考 Claude Code）

---

## Day 10（周三晚）· 2 小时：Chat 浮层

**目标**
- 右下角 Chat 浮层
- 流式输出 + Markdown 渲染
- 历史对话记录

**核心任务**
```typescript
// ChatService (后端)
- POST /api/agent/chat/stream
- 流式返回（SSE 或 WebSocket）
- 复用 Day 5 的工具集

// ChatBox.vue (前端)
- 浮层 UI（可拖拽）
- @ai-sdk/vue 的 useChat
- Markdown 渲染
```

**验收**
- [ ] Chat 能流式输出
- [ ] Agent 能调用工具回答问题
- [ ] 5 个典型问题测试通过

---

## Day 11（周四晚）· 2 小时：Swagger + 单元测试

**目标**
- 完善 Swagger 文档
- 核心 Service 单元测试
- 覆盖率 ≥ 70%

**核心任务**
```typescript
// Swagger
- 所有 DTO 加 @ApiProperty
- Controller 加 @ApiTags
- 响应模型 @ApiResponse

// 测试
- AnomalyDetectorService.spec.ts
- AgentService.spec.ts
- Mock Prisma / EventEmitter
```

**验收**
- [ ] /api/docs 页面完整
- [ ] `pnpm test` 全过
- [ ] 覆盖率报告 ≥ 70%

---

## Day 12（周五晚）· 2 小时：性能优化

**目标**
- WebSocket 数据压缩
- Echarts 性能优化
- 内存泄漏排查

**核心任务**
```typescript
// 后端优化
- WebSocket 数据批量发送
- 限制推送频率（throttle）

// 前端优化
- Echarts dataZoom
- 虚拟滚动（异常列表）
- 内存泄漏检测（Chrome DevTools）
```

**验收**
- [ ] 系统运行 1 小时无卡顿
- [ ] Chrome Performance 分析通过
- [ ] 内存稳定（无明显增长）

---

## Day 13（周六）· 6 小时：工具调用统计 + 监控

**目标**
- 工具调用统计大盘
- Agent 性能监控
- 日志聚合

**核心任务**
```typescript
// 统计 API
- GET /api/stats/tool-calls
- GET /api/stats/diagnosis-performance
- 按时间范围聚合

// 可视化
- 工具调用饼图
- 诊断耗时趋势
- 异常类型分布
```

**验收**
- [ ] 统计数据准确
- [ ] 图表实时更新
- [ ] 可按时间范围筛选

---

## Day 14（周日）· 6 小时：Docker 部署上线

**目标**
- Docker 镜像构建
- docker-compose 编排
- 腾讯云部署

**核心任务**
```dockerfile
# backend/Dockerfile
FROM node:18-alpine
# 多阶段构建

# frontend/Dockerfile
FROM node:18-alpine AS builder
FROM nginx:alpine

# docker-compose.yml
services:
  - postgres
  - backend
  - frontend
  - redis (可选)
```

**部署步骤**
1. 腾讯云轻量服务器（2C4G）
2. 安装 Docker + docker-compose
3. Caddy 反向代理 + HTTPS
4. 配置域名 DNS
5. 运行 `docker-compose up -d`

**验收**
- [ ] 公网 HTTPS URL 可访问
- [ ] 所有功能正常工作
- [ ] 连续运行 24h 稳定

---

## Week 2 复盘（Day 14 下午）

### 完成情况
- [ ] P1 项目 4 个核心功能完成
- [ ] Demo 视频录制（5 分钟）
- [ ] GitHub README 完善
- [ ] 技术博客撰写

### 简历更新

```markdown
## 项目经验

### 智能异常监控平台（个人项目）
**技术栈**：Vue 3 + NestJS + Postgres + WebSocket + DeepSeek

**项目描述**：
实时监控工业设备指标，通过 AI Agent 自主完成异常诊断。

**核心功能**：
- 实时监控：WebSocket 推送，Echarts 流式渲染，支持 10+ 设备
- 智能检测：3 类检测算法（阈值/突增/趋势），误报率 < 10%
- 自主诊断：Agent 在异常触发后 < 30s 自动完成 5 步诊断
- 工具调用：5 个工业工具，平均每次诊断调用 ≥ 3 个

**技术亮点**：
- 事件驱动架构：EventEmitter 解耦检测与诊断
- Multi-step Agent：maxSteps + onStepFinish 实现多步推理
- 性能优化：滑动窗口 + dataZoom，长时间运行无内存泄漏
- 生产级工程：JWT 鉴权 + Swagger + 70% 测试覆盖 + Docker 部署

**项目成果**：
- GitHub Star: xxx（如果开源）
- Demo: https://your-domain.com
- 博客阅读：xxx+

**个人收获**：
从前端工程师到全栈 + AI，14 天完成从 0 到上线。
```

---

## Week 2 总结

**Day 8-14 学到了什么**：
- WebSocket 实时通信 ✅
- Echarts 性能优化 ✅
- UI 组件设计（时间线 / Chat）✅
- 单元测试与覆盖率 ✅
- Docker 容器化部署 ✅
- 生产级工程实践 ✅

**P1 项目完整度**：100%
- 后端：NestJS + Prisma + WebSocket ✅
- AI：DeepSeek + Tool Calling + Multi-step ✅
- 前端：Vue 3 + Echarts + 实时 UI ✅
- 工程：鉴权 + 测试 + 部署 ✅

**下周预告（Day 15-30）**：
- P2 项目：RAG Agent 故障知识库
- 核心技术：pgvector + LangChain.js + Embedding
- 新增能力：向量检索 + 知识图谱 + RAG Eval

---

## 📋 Week 2 详细计划获取方式

如需 Day 9-14 的详细每日计划（类似 Day 1-7 的详细程度），包含：
- 完整代码示例
- 分步骤操作指南
- 详细验收清单
- 思考题与扩展

随时告诉我，我会生成详细版。

---

**准备好进入 Week 2 了吗？🚀**
