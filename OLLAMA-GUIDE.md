# Ollama 本地 AI 模型使用指南

## 📋 为什么使用 Ollama？

### 优势
- ✅ **完全免费**：无需 API Key，无使用限制
- ✅ **数据隐私**：所有数据在本地处理，不上传云端
- ✅ **离线可用**：无需网络连接
- ✅ **多种模型**：支持 Llama3, Qwen, DeepSeek-Coder 等
- ✅ **中文友好**：Qwen2.5 对中文支持极好

### 对比 DeepSeek / GPT-4
| 特性 | Ollama | DeepSeek | GPT-4 |
|------|--------|----------|-------|
| 成本 | 免费 | $0.42/1M tokens | $40/1M tokens |
| 隐私 | 本地运行 | 云端 | 云端 |
| 速度 | 取决于硬件 | 快 | 快 |
| 中文能力 | 优秀（Qwen） | 优秀 | 良好 |
| 联网 | 无需 | 需要 | 需要 |

## 🚀 快速开始

### 1. 安装 Ollama

**Windows**:
```bash
# 下载并安装
https://ollama.ai/download/windows

# 验证安装
ollama --version
```

**Mac**:
```bash
# 使用 Homebrew
brew install ollama

# 或下载安装包
https://ollama.ai/download/mac
```

**Linux**:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. 启动 Ollama 服务

```bash
# 启动服务（后台运行）
ollama serve

# 或在 Windows 上，安装后会自动启动服务
```

### 3. 拉取模型

```bash
# 推荐模型：Qwen2.5（中文最好）
ollama pull qwen2.5

# 其他可选模型：
ollama pull llama3          # Meta 的 Llama 3
ollama pull deepseek-coder  # 专门用于代码生成
ollama pull mistral         # 欧洲开源模型
```

### 4. 测试模型

```bash
# 命令行测试
ollama run qwen2.5 "你好，请用中文介绍一下 NestJS"

# 应该看到流式输出
```

## 🔧 在项目中使用

### 安装依赖

```bash
cd backend
pnpm add ollama
```

### 配置环境变量

```bash
# backend/.env
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="qwen2.5"
```

### 使用示例（Day 5 会详细学习）

```typescript
import { Ollama } from 'ollama';

@Injectable()
export class AgentService {
  private ollama: Ollama;
  
  constructor() {
    this.ollama = new Ollama({
      host: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    });
  }
  
  async generateDiagnosis(anomaly: string) {
    const response = await this.ollama.chat({
      model: 'qwen2.5',
      messages: [
        {
          role: 'system',
          content: '你是一个系统运维专家...',
        },
        {
          role: 'user',
          content: `请诊断这个异常：${anomaly}`,
        },
      ],
      stream: true,  // 流式输出
    });
    
    for await (const chunk of response) {
      console.log(chunk.message.content);
    }
  }
}
```

## 📊 推荐模型选择

### 1. Qwen2.5（强烈推荐）⭐⭐⭐
```bash
ollama pull qwen2.5
```
- **大小**：~4.7GB
- **优势**：中文能力最强，推理速度快
- **适用**：通用任务、中文对话、异常诊断
- **推荐指数**：⭐⭐⭐⭐⭐

### 2. Llama3
```bash
ollama pull llama3
```
- **大小**：~4.7GB
- **优势**：Meta 官方模型，性能稳定
- **适用**：通用任务、英文优先场景
- **推荐指数**：⭐⭐⭐⭐

### 3. DeepSeek-Coder
```bash
ollama pull deepseek-coder
```
- **大小**：~3.8GB
- **优势**：专门为代码生成优化
- **适用**：代码生成、代码审查、Bug 修复
- **推荐指数**：⭐⭐⭐⭐⭐

### 4. Mistral
```bash
ollama pull mistral
```
- **大小**：~4.1GB
- **优势**：欧洲开源模型，平衡性能和速度
- **适用**：通用任务
- **推荐指数**：⭐⭐⭐

## 🎯 针对本项目的建议

### P1 智能异常监控平台（Day 1-15）
**推荐模型**：`qwen2.5`

**原因**：
- ✅ 异常诊断需要中文输出
- ✅ 推理速度快，适合实时诊断
- ✅ 对工业运维场景理解好

**配置**：
```bash
# .env
OLLAMA_MODEL="qwen2.5"
```

### P2 RAG 知识库（Day 16-30）
**推荐模型**：`qwen2.5` + `nomic-embed-text`（Embedding）

```bash
ollama pull qwen2.5           # 生成模型
ollama pull nomic-embed-text  # Embedding 模型
```

### P3 多 Agent 协作（Day 31-45）
**推荐模型**：`qwen2.5`（统一使用一个模型）

### P4 3D 智能机房（Day 46-60）
**推荐模型**：`qwen2.5`

## 🛠️ 常用命令

```bash
# 查看已安装的模型
ollama list

# 删除模型（释放空间）
ollama rm llama3

# 查看模型信息
ollama show qwen2.5

# 停止 Ollama 服务
# Windows: 任务管理器结束 ollama.exe
# Mac/Linux: killall ollama
```

## ⚡ 性能优化

### 1. 硬件要求
- **最低配置**：8GB RAM，集成显卡
- **推荐配置**：16GB+ RAM，独立显卡（NVIDIA/AMD）
- **理想配置**：32GB+ RAM，RTX 3060+ GPU

### 2. GPU 加速（可选）
```bash
# 如果有 NVIDIA 显卡，Ollama 会自动使用 GPU
# 查看是否使用 GPU
nvidia-smi

# 在输出中看到 ollama 进程，说明在用 GPU
```

### 3. 模型量化（节省内存）
```bash
# 默认：4-bit 量化（qwen2.5）
ollama pull qwen2.5

# 如果内存充足，可用更大的版本：
ollama pull qwen2.5:14b  # 14B 参数版本（更准确，但更慢）
```

## 🐛 常见问题

### 1. Ollama 服务启动失败
**问题**：`Error: couldn't connect to ollama server`

**解决**：
```bash
# 手动启动服务
ollama serve

# 或 Windows 上检查服务是否运行
tasklist | findstr ollama
```

### 2. 模型下载慢
**问题**：`Pulling model... 1% (10MB/4.7GB)`

**解决**：
- 耐心等待（首次下载较大）
- 使用国内镜像源（如果有）
- 换时间段下载（避开高峰期）

### 3. 推理速度慢
**问题**：响应时间 > 30 秒

**解决**：
- 使用更小的模型（如 `qwen2.5:1.5b`）
- 减少 `max_tokens`
- 使用 GPU 加速
- 关闭其他占用资源的程序

### 4. 中文输出乱码
**问题**：输出包含 `中文` 等

**解决**：
```typescript
// 使用 Qwen2.5，默认支持中文
const response = await ollama.chat({
  model: 'qwen2.5',  // 不要用 llama3
  // ...
});
```

## 📚 参考资料

- [Ollama 官方文档](https://ollama.ai/docs)
- [Ollama GitHub](https://github.com/ollama/ollama)
- [模型库](https://ollama.ai/library)
- [Qwen2.5 模型介绍](https://ollama.ai/library/qwen2.5)

## 🎓 学习建议

### Day 1-4：熟悉 Ollama
- 安装并测试 Ollama
- 尝试不同模型
- 理解 prompt 的重要性

### Day 5-6：集成到项目（核心）⭐⭐⭐
- 使用 Ollama SDK
- 实现 Tool Calling
- 处理流式输出

### Day 7+：优化和调试
- 优化 prompt
- 处理异常情况
- 性能监控

---

**现在，确保 Ollama 已安装并运行，准备好在 Day 5 使用它！** 🚀

```bash
# 验证 Ollama 是否就绪
ollama list          # 查看已安装的模型
ollama run qwen2.5   # 测试模型
```
