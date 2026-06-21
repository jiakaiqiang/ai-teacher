# AI前端导师 - 6周学习计划

## 课程目标
从传统前端工程师升级为AI前端架构师，完成lighthouse-ai-analyzer项目，获得求职竞争力

## 学习路线总览

### Week 1-2：AI项目开发（lighthouse-ai-analyzer）
### Week 3-4：包装与输出（简历+文章+作品集）
### Week 5-6：面试准备与求职

---

## 详细学习计划

### Week 1：Next.js + AI基础

#### Day 1 - Next.js快速入门
**学习目标：**
- 理解Next.js核心概念（App Router、Server Components）
- 能创建第一个Next.js项目

**学习内容：**
1. Next.js官方文档：https://nextjs.org/learn
   - 第1-3章：基础概念（2小时）
2. 创建项目：`npx create-next-app@latest lighthouse-ai-analyzer`
3. 理解目录结构：app/、components/、public/

**实战任务：**
```bash
# 1. 创建项目
npx create-next-app@latest lighthouse-ai-analyzer --typescript --tailwind --app

# 2. 运行项目
cd lighthouse-ai-analyzer
npm run dev

# 3. 修改首页（app/page.tsx）
# 添加标题："AI性能分析助手"
# 添加一个输入框和按钮
```

**检查标准：**
- [ ] 项目能正常运行在 localhost:3000
- [ ] 能看到自定义的标题和输入框
- [ ] 提交代码到GitHub

**时间安排：** 4小时（建议晚上7-11点）

---

#### Day 2 - Tailwind CSS + 页面布局
**学习目标：**
- 掌握Tailwind基本用法
- 完成主页面布局

**学习内容：**
1. Tailwind官方文档基础部分（1小时）
2. 常用类名：flex、grid、bg、text、p、m等

**实战任务：**
创建三个主要区域：
```typescript
// app/page.tsx 结构
<main>
  {/* 1. Header - 标题和说明 */}
  {/* 2. Input Section - URL输入 + 分析按钮 */}
  {/* 3. Result Section - 结果展示区域 */}
</main>
```

**检查标准：**
- [ ] 页面布局美观（居中、间距合理）
- [ ] 响应式设计（手机端也能看）
- [ ] 颜色搭配舒服

**时间安排：** 3小时

---

#### Day 3 - OpenAI API集成
**学习目标：**
- 理解OpenAI API调用流程
- 完成第一次AI对话

**学习内容：**
1. 注册OpenAI账号（或用国内替代：通义千问/Kimi）
2. 获取API Key
3. Vercel AI SDK文档：https://sdk.vercel.ai/docs

**实战任务：**
```typescript
// 1. 安装依赖
npm install ai openai

// 2. 创建API路由：app/api/chat/route.ts
import OpenAI from 'openai';

export async function POST(req: Request) {
  const { message } = await req.json();
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: message }],
  });

  return Response.json({ 
    reply: completion.choices[0].message.content 
  });
}

// 3. 前端调用
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ message: 'Hello AI' })
});
```

**检查标准：**
- [ ] 能成功调用AI并得到回复
- [ ] 在页面上显示AI的回复
- [ ] 错误处理（API失败时显示提示）

**时间安排：** 4小时

---

#### Day 4 - Lighthouse集成
**学习目标：**
- 用代码运行Lighthouse
- 获取性能数据

**学习内容：**
1. Lighthouse Node API文档
2. 理解性能指标：FCP、LCP、TTI、CLS

**实战任务：**
```typescript
// 1. 安装
npm install lighthouse chrome-launcher

// 2. 创建分析API：app/api/analyze/route.ts
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

export async function POST(req: Request) {
  const { url } = await req.json();
  
  // 启动Chrome
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless']
  });
  
  // 运行Lighthouse
  const options = {
    logLevel: 'info',
    output: 'json',
    port: chrome.port
  };
  
  const runnerResult = await lighthouse(url, options);
  
  // 关闭Chrome
  await chrome.kill();
  
  // 返回性能数据
  return Response.json({
    performance: runnerResult.lhr.categories.performance.score,
    fcp: runnerResult.lhr.audits['first-contentful-paint'].displayValue,
    lcp: runnerResult.lhr.audits['largest-contentful-paint'].displayValue,
  });
}
```

**检查标准：**
- [ ] 输入URL能成功运行Lighthouse
- [ ] 能看到FCP、LCP等指标
- [ ] 处理超时和错误情况

**时间安排：** 5小时

---

#### Day 5 - 数据可视化
**学习目标：**
- 用图表展示性能数据
- 让结果更直观

**学习内容：**
1. Chart.js或Recharts库
2. 条形图、雷达图的使用

**实战任务：**
```typescript
// 1. 安装
npm install recharts

// 2. 创建性能图表组件
import { RadarChart, Radar } from 'recharts';

const data = [
  { metric: 'FCP', score: 90 },
  { metric: 'LCP', score: 85 },
  { metric: 'TTI', score: 88 },
  { metric: 'CLS', score: 95 },
];

<RadarChart width={500} height={400} data={data}>
  <Radar dataKey="score" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
</RadarChart>
```

**检查标准：**
- [ ] 性能数据用图表展示
- [ ] 有颜色区分（好/中/差）
- [ ] 动画效果

**时间安排：** 4小时

---

#### Day 6-7 - AI分析功能（核心）
**学习目标：**
- AI根据性能数据生成优化建议
- 生成具体代码示例

**学习内容：**
1. Prompt Engineering基础
2. 结构化输出（JSON Schema）

**实战任务：**
```typescript
// app/api/ai-analyze/route.ts
const prompt = `
你是一个前端性能优化专家。分析以下Lighthouse报告：

URL: ${url}
FCP: ${fcp}
LCP: ${lcp}
性能评分: ${score}

请给出：
1. 主要性能问题（3条）
2. 具体优化方案（包含代码示例）
3. 预期提升效果

以JSON格式返回：
{
  "issues": ["问题1", "问题2", "问题3"],
  "solutions": [
    {
      "title": "优化标题",
      "description": "详细说明",
      "code": "代码示例"
    }
  ],
  "expectedImprovement": "预期FCP降低50%"
}
`;

const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: prompt }],
  response_format: { type: "json_object" }
});
```

**检查标准：**
- [ ] AI能生成针对性的优化建议
- [ ] 包含具体代码示例
- [ ] 建议合理且可执行

**时间安排：** 12小时（周末集中）

---

### Week 2：项目完善与部署

#### Day 8-9 - UI优化 + 用户体验
**学习内容：**
- Loading状态
- 错误提示
- 结果对比功能

**实战任务：**
1. 添加Loading动画（分析中...）
2. 保存历史记录（对比优化前后）
3. 导出PDF报告功能

**检查标准：**
- [ ] 体验流畅（没有卡顿感）
- [ ] 错误提示友好
- [ ] 能保存和对比结果

**时间安排：** 8小时

---

#### Day 10 - 部署上线
**学习内容：**
- Vercel部署流程
- 环境变量配置

**实战任务：**
```bash
# 1. 连接GitHub
git remote add origin https://github.com/你的用户名/lighthouse-ai-analyzer.git
git push -u origin main

# 2. 在Vercel部署
# 访问 vercel.com → 导入GitHub仓库
# 设置环境变量：OPENAI_API_KEY

# 3. 获得在线地址
# https://lighthouse-ai-analyzer.vercel.app
```

**检查标准：**
- [ ] 项目成功部署到Vercel
- [ ] 在线版本可以正常使用
- [ ] API不会暴露密钥

**时间安排：** 3小时

---

#### Day 11-12 - 文档 + 推广
**实战任务：**
1. 写详细的README.md
2. 录制3分钟演示视频
3. 发布到：
   - 掘金：《我用AI做了一个前端性能分析工具》
   - V2EX：/t/lighthouse-ai-analyzer
   - Reddit: r/webdev

**检查标准：**
- [ ] README包含：功能介绍、技术栈、使用方法、截图
- [ ] 视频清晰（录屏+配音）
- [ ] 至少3个平台发布
- [ ] 获得50+ GitHub Star

**时间安排：** 8小时

---

### Week 3：简历重构

#### Day 13-15 - 简历彻底重写
**学习内容：**
- STAR法则（Situation、Task、Action、Result）
- 如何量化成果

**实战任务：**
用我给你的新简历模板，逐条改写：
1. 每个项目用STAR法则
2. 加入lighthouse-ai-analyzer
3. 突出AI技能和性能优化

**检查标准：**
- [ ] 每个项目都有业务背景+方案+价值
- [ ] 有具体数字（降低90%、提升45%等）
- [ ] AI技能放在显眼位置
- [ ] GitHub链接可访问

**时间安排：** 6小时

---

#### Day 16-18 - 技术文章创作
**实战任务：**
写2篇爆款文章（参考我之前给的结构）

**文章1：《5年前端14天做出AI项目的实战指南》**
- 字数：3000+
- 配图：至少5张
- 代码示例：3-5个

**文章2：《前端性能优化：从17.6s到1.8s的完整方案》**
- 结合你的真实案例
- lighthouse报告截图
- 优化前后对比

**检查标准：**
- [ ] 发布到掘金+知乎
- [ ] 总阅读量5000+
- [ ] 有人评论/点赞

**时间安排：** 12小时

---

#### Day 19-21 - 作品集网站
**实战任务：**
用Next.js快速搭建个人网站

**必须包含：**
1. 首页：自我介绍+技能雷达图
2. 项目页：lighthouse-ai-analyzer展示
3. 博客页：2篇文章嵌入
4. 关于页：联系方式

**检查标准：**
- [ ] 设计简洁大方
- [ ] 响应式（手机端可看）
- [ ] 部署到Vercel
- [ ] 有自定义域名（可选）

**时间安排：** 8小时

---

### Week 4：面试准备

#### Day 22-24 - 手写代码题
**学习内容：**
LeetCode中等难度题目

**必刷清单：**
1. 数组：两数之和、三数之和
2. 链表：反转链表、环形链表
3. 树：二叉树遍历、最大深度
4. 动态规划：爬楼梯、最长子序列
5. 字符串：最长回文子串

**每天任务：**
- 做5题（2题复习+3题新题）
- 用TypeScript实现
- 写测试用例

**检查标准：**
- [ ] 每题能在20分钟内AC
- [ ] 能清晰讲解思路
- [ ] 时间复杂度分析正确

**时间安排：** 每天2小时

---

#### Day 25-26 - AI场景题准备
**实战任务：**
准备3个AI集成方案

**题目1：设计一个AI代码审查系统**
```
面试官可能问：
- 架构设计？
- 如何保证准确性？
- 怎么处理大文件？
- 成本控制？

你的回答要点：
1. 架构图（画出来）
2. 技术选型（为什么用GPT-4o-mini）
3. 优化方案（缓存、批处理）
4. 风险预案（API失败怎么办）
```

**题目2：实现一个智能客服**
**题目3：做一个AI文档生成器**

**检查标准：**
- [ ] 能在白板上画架构图
- [ ] 讲清楚技术选型理由
- [ ] 考虑到成本和性能

**时间安排：** 8小时

---

#### Day 27-28 - 系统设计
**学习内容：**
- 前端系统设计套路
- 高并发处理
- 缓存策略

**必备题目：**
1. 设计一个前端监控系统
2. 设计一个图片上传服务
3. 设计一个实时聊天应用
4. 设计一个低代码平台

**检查标准：**
- [ ] 能画出清晰的架构图
- [ ] 考虑到扩展性
- [ ] 有性能优化方案

**时间安排：** 8小时

---

### Week 5：B/C类公司投递

#### Day 29-35 - 投递与面试
**每天任务：**
1. 早上：投递5家公司（Boss直聘、拉勾）
2. 下午：准备面试（复习项目）
3. 晚上：如有面试，复盘总结

**投递话术模板：**
```
你好，我是一名有5年经验的前端工程师，
最近在AI方向深耕，做了一个开源的性能分析工具。

我的优势：
1. 性能优化实战（FCP降低90%）
2. AI集成能力（有完整项目）
3. 工程化经验（Docker、CI/CD）

项目地址：https://github.com/xxx/lighthouse-ai-analyzer
在线演示：https://lighthouse-ai-analyzer.vercel.app

期望薪资：[根据公司定]
可以聊一下吗？
```

**检查标准：**
- [ ] 每天投递5家
- [ ] 面试后24小时内复盘
- [ ] 拿到至少3个offer

---

### Week 6：A类大厂冲击

#### Day 36-42 - 大厂内推与面试
**目标公司：**
1. 字节跳动（AI Lab、前端架构）
2. 阿里（淘宝、钉钉）
3. 腾讯（微信、腾讯云）
4. 快手、美团、京东

**内推获取方式：**
1. 掘金文章下找内推（留言"求内推"）
2. V2EX发帖：《5年前端，做了AI项目，求内推》
3. 牛客网找内推码
4. LinkedIn加HR

**面试准备：**
- 每天复习一个核心项目
- 模拟面试（找朋友或用AI）
- 准备反问问题

**检查标准：**
- [ ] 至少4家内推成功
- [ ] 拿到2+ offer
- [ ] 薪资涨幅40%+

---

## 每日检查机制

### 自查清单模板
```markdown
## Day X 学习报告

### 完成情况
- [ ] 学习内容看完了吗？
- [ ] 实战任务完成了吗？
- [ ] 代码提交到GitHub了吗？

### 遇到的问题
1. [问题描述]
   - 尝试的解决方法
   - 最终是否解决

### 今日收获
1. [学到的最重要的东西]
2. [可以应用到项目中的技巧]

### 明天计划
- [ ] 任务1
- [ ] 任务2

### 学习时长
实际花费：X小时（目标：X小时）
```

---

## AI导师检查标准

### 技术检查点
1. **代码质量**
   - TypeScript类型定义正确
   - 有错误处理
   - 代码可读性好

2. **功能完整性**
   - 基础功能能跑通
   - 边界情况处理
   - 用户体验流畅

3. **项目进度**
   - 按时完成每日任务
   - GitHub有持续提交
   - 里程碑达成

### 软技能检查
1. **学习能力**
   - 遇到问题能自己查资料
   - 会用AI辅助学习
   - 举一反三

2. **执行力**
   - 不拖延
   - 高质量完成任务
   - 主动思考优化

3. **表达能力**
   - 能清晰描述问题
   - 文章可读性强
   - 简历逻辑清晰

---

## 紧急救援机制

### 如果某天完不成任务
1. **评估原因**
   - 任务太难？→ 降低难度
   - 时间不够？→ 调整计划
   - 没动力？→ 回顾目标

2. **调整策略**
   - 延长1-2天（但总时长不变）
   - 找人一起做（accountability partner）
   - 用AI工具加速（Cursor/Claude）

3. **保底方案**
   - 至少完成核心功能（能跑就行）
   - 文档可以简化（但必须有）
   - Star数可以放宽（30个也行）

---

## 成功标志

### 硬性指标
- [ ] lighthouse-ai-analyzer部署上线
- [ ] GitHub Star 50+
- [ ] 2篇技术文章发布
- [ ] 新简历完成
- [ ] 拿到5+ offer

### 软性指标
- [ ] 能自信讲解AI集成方案
- [ ] 面试不怯场
- [ ] 有持续学习的习惯
- [ ] 建立了个人品牌

---

## 学习资源汇总

### 官方文档（必读）
- Next.js: https://nextjs.org/docs
- Vercel AI SDK: https://sdk.vercel.ai/docs
- OpenAI API: https://platform.openai.com/docs
- Lighthouse: https://github.com/GoogleChrome/lighthouse

### 视频教程（可选）
- Next.js 14完整教程（YouTube）
- Vercel AI SDK实战（B站）

### 开源项目参考
- v0.dev（看架构）
- shadcn/ui（学组件）
- NextChat（学AI集成）

---

## 联系与答疑

遇到问题时：
1. 先Google / Stack Overflow
2. 问AI（Claude/ChatGPT）
3. 看GitHub Issues
4. 实在不行问我（每天晚上答疑）

---

最后的话：
**这6周会很辛苦，但改变就在这42天。**
**每天进步一点，6周后你会感谢现在拼命的自己。**

开始吧！🚀
