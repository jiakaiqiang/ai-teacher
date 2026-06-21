# P4 3D 智能机房平台 - 产品需求文档（PRD）

## 📋 文档信息

| 项目 | 信息 |
|------|------|
| **项目名称** | 3D 智能机房平台 |
| **项目代号** | P4-3D-Platform |
| **版本** | v1.0 |
| **目标周期** | Day 46-60 |

## 1. 产品定位

### 1.1 一句话描述
整合 P1/P2/P3 的所有能力，加上 Three.js 3D 可视化，打造**生产级、差异化、可上线**的 Agent 应用平台。

### 1.2 核心价值

```
P1-P3 是能力建设：
  P1: 单 Agent + 实时监控
  P2: RAG 知识库
  P3: Multi-Agent 协作

P4 是综合呈现：
  ✅ 3D 可视化（你的差异化）
  ✅ AI + 3D 联动
  ✅ 真实用户运营
  ✅ 简历杀器
```

### 1.3 为什么 3D 是杀手锏

```
市面上的 AI 项目：
  - Chat 应用：成千上万
  - RAG 知识库：很多
  - Agent 应用：开始多起来
  
3D + AI 项目：
  - 数量极少（< 5%）
  - 技术门槛高（3D + AI 双栈）
  - 视觉冲击力强（面试加分）
  - 你的 6 年前端 + Three.js 经验直接发挥
```

## 2. 功能需求

### 2.1 核心功能清单

| 功能 | 优先级 | 描述 |
|------|-------|------|
| 3D 机房场景 | P0 | Three.js 渲染机房 |
| 实时数据可视化 | P0 | 设备状态 3D 展示 |
| 自然语言操作 3D | P0 | "看 srv-001" → 相机飞过去 |
| Agent 工作流可视化 | P1 | P3 Multi-Agent 实时展示 |
| 多模态识别 | P1 | 上传机房照片识别设备 |
| 监控大屏模式 | P1 | 大屏展示版（适合展示） |
| 移动端适配 | P2 | 手机查看 |
| 用户行为分析 | P2 | PostHog 集成 |

### 2.2 详细设计

#### 2.2.1 3D 机房场景

**场景层次**：
```
机房园区（Campus）
  └── 单个机房（Room）
        └── 机柜列（Aisle）
              └── 单个机柜（Rack）
                    └── 服务器（Server）
                          └── 组件（CPU/Memory/Disk）
```

**实现**：
```typescript
// scene/Campus.tsx
const Campus = () => {
  return (
    <Canvas camera={{ position: [0, 50, 50] }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} />
      <OrbitControls />
      
      {/* 多个机房 */}
      {rooms.map((room) => (
        <Room key={room.id} room={room} />
      ))}
      
      {/* 实时告警粒子 */}
      <AlertParticles anomalies={anomalies} />
      
      {/* 相机控制 */}
      <CameraController target={focusTarget} />
    </Canvas>
  );
};

// scene/Rack.tsx
const Rack = ({ rack, servers }) => {
  return (
    <group position={rack.position}>
      {/* 机柜框架 */}
      <Box args={[0.6, 2, 1]} material-color="#444" />
      
      {/* 内部服务器 */}
      {servers.map((server, i) => (
        <Server
          key={server.id}
          position={[0, i * 0.05 - 0.95, 0]}
          server={server}
        />
      ))}
    </group>
  );
};

// scene/Server.tsx
const Server = ({ server, position }) => {
  // 根据状态变色
  const color = useMemo(() => {
    switch (server.status) {
      case 'online': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  }, [server.status]);
  
  // 异常时闪烁
  const meshRef = useRef();
  useFrame((state) => {
    if (server.hasAnomaly) {
      meshRef.current.material.emissiveIntensity = 
        Math.sin(state.clock.elapsedTime * 5) * 0.5 + 0.5;
    }
  });
  
  return (
    <mesh ref={meshRef} position={position} onClick={() => handleClick(server)}>
      <boxGeometry args={[0.55, 0.04, 0.95]} />
      <meshStandardMaterial color={color} emissive={color} />
    </mesh>
  );
};
```

#### 2.2.2 自然语言操作 3D

**核心 Agent**：
```typescript
const sceneControlTools = {
  // 1. 移动相机
  moveCameraTo: tool({
    description: '移动相机到指定位置',
    parameters: z.object({
      target: z.string().describe('目标：room:roomA / server:srv-001 / overview'),
      duration: z.number().default(2000).describe('动画时长（毫秒）'),
    }),
    execute: async ({ target, duration }) => {
      const position = resolveTarget(target);
      await sceneController.flyTo(position, duration);
      return { moved: true, target };
    },
  }),
  
  // 2. 高亮设备
  highlightDevices: tool({
    description: '高亮显示一组设备',
    parameters: z.object({
      serverIds: z.array(z.string()),
      color: z.string().default('#ef4444'),
      duration: z.number().default(5000),
    }),
    execute: async ({ serverIds, color, duration }) => {
      sceneController.highlight(serverIds, color, duration);
      return { highlighted: serverIds.length };
    },
  }),
  
  // 3. 显示面板
  showPanel: tool({
    description: '显示设备详情面板',
    parameters: z.object({
      serverId: z.string(),
      panelType: z.enum(['details', 'metrics', 'history']),
    }),
    execute: async ({ serverId, panelType }) => {
      uiController.openPanel(serverId, panelType);
      return { opened: true };
    },
  }),
  
  // 4. 改变视角模式
  changeViewMode: tool({
    description: '切换视角模式',
    parameters: z.object({
      mode: z.enum(['overview', 'roomDetail', 'rackDetail', 'serverDetail']),
    }),
    execute: async ({ mode }) => {
      sceneController.setViewMode(mode);
      return { mode };
    },
  }),
};
```

**使用示例**：
```
用户："让我看看 A 机房"
→ Agent 调用 moveCameraTo('room:roomA')
→ 相机平滑飞向 A 机房

用户："哪些服务器有异常？"
→ Agent 查询异常列表
→ 调用 highlightDevices(异常设备列表)
→ 调用 changeViewMode('overview')
→ 设备闪烁红色

用户："srv-001 的详情"
→ Agent 调用 moveCameraTo('server:srv-001')
→ 相机聚焦
→ 调用 showPanel('srv-001', 'details')
→ 弹出详情面板
```

#### 2.2.3 Agent 工作流可视化

**3D 中展示 P3 的 Multi-Agent 协作**：

```typescript
// 4 个 Agent 在 3D 场景中有固定位置
const agentPositions = {
  monitor: [-10, 5, 0],
  diagnose: [-5, 5, 0],
  repair: [5, 5, 0],
  verify: [10, 5, 0],
};

// Agent 之间的消息用线条 + 粒子展示
const AgentFlow = ({ messages }) => {
  return (
    <>
      {/* Agent 节点 */}
      {Object.entries(agentPositions).map(([name, pos]) => (
        <AgentNode key={name} name={name} position={pos} />
      ))}
      
      {/* 消息流 */}
      {messages.map((msg) => (
        <MessageFlow
          key={msg.id}
          from={agentPositions[msg.fromAgent]}
          to={agentPositions[msg.toAgent]}
          type={msg.type}
        />
      ))}
    </>
  );
};

const MessageFlow = ({ from, to, type }) => {
  // 沿着路径运动的粒子
  const points = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    return [start, end];
  }, [from, to]);
  
  return (
    <>
      <Line points={points} color={type === 'error' ? 'red' : 'blue'} />
      <Sphere>
        {/* 粒子动画 */}
      </Sphere>
    </>
  );
};
```

#### 2.2.4 多模态识别

**上传机房照片识别设备**：

```typescript
// 使用 Claude 3 Vision
async function recognizeFromPhoto(imageFile: File) {
  const base64 = await fileToBase64(imageFile);
  
  const result = await generateText({
    model: claude('claude-3-opus'),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            image: base64,
          },
          {
            type: 'text',
            text: `请识别图片中的服务器设备，返回 JSON 格式：
{
  "rooms": [{
    "name": "机房名称",
    "racks": [{
      "position": "位置",
      "servers": [{
        "type": "服务器型号",
        "status": "online/offline",
        "indicators": ["green", "red"]
      }]
    }]
  }]
}`,
          },
        ],
      },
    ],
  });
  
  return JSON.parse(result.text);
}
```

#### 2.2.5 监控大屏模式

**适合展示用的全屏大屏**：

```vue
<template>
  <div class="big-screen">
    <!-- 标题 -->
    <header class="screen-header">
      <h1>智能机房监控大屏</h1>
      <div class="time">{{ currentTime }}</div>
    </header>
    
    <!-- 主体：3D + 数据 -->
    <main class="screen-main">
      <!-- 左侧：实时数据 -->
      <aside class="left-panel">
        <KPICard title="设备总数" :value="totalServers" />
        <KPICard title="在线设备" :value="onlineServers" trend="+2" />
        <KPICard title="今日异常" :value="todayAnomalies" trend="-5" />
        <KPICard title="自动修复" :value="autoFixedCount" />
        
        <!-- 实时图表 -->
        <RealtimeChart :data="cpuTrend" />
      </aside>
      
      <!-- 中间：3D 机房 -->
      <section class="center-3d">
        <Campus3D :data="sceneData" />
      </section>
      
      <!-- 右侧：异常 + Agent -->
      <aside class="right-panel">
        <AnomalyList :anomalies="recentAnomalies" />
        <AgentStatus :agents="agentStates" />
      </aside>
    </main>
  </div>
</template>
```

### 2.3 性能优化

#### 2.3.1 3D 性能

```typescript
// 1. InstancedMesh：100 个相同设备只需一次 draw call
const ServerInstances = ({ servers }) => {
  return (
    <Instances limit={1000}>
      <boxGeometry />
      <meshStandardMaterial />
      {servers.map((server, i) => (
        <Instance key={server.id} position={server.position} color={server.color} />
      ))}
    </Instances>
  );
};

// 2. LOD（Level of Detail）：远处的设备简化模型
const ServerLOD = ({ server }) => {
  return (
    <Lod>
      <ServerHighDetail distance={0} />    {/* 近 */}
      <ServerMediumDetail distance={20} /> {/* 中 */}
      <ServerLowDetail distance={50} />    {/* 远 */}
    </Lod>
  );
};

// 3. Frustum Culling：视野外的不渲染
// Three.js 默认开启
```

#### 2.3.2 加载性能

```typescript
// 1. 模型分包加载
const Campus = lazy(() => import('./scene/Campus'));

// 2. 纹理压缩（KTX2）
const texture = useTexture('/textures/rack.ktx2');

// 3. CDN 加速
// 使用 Cloudflare 全球分发
```

## 3. 性能指标

| 指标 | 目标 |
|------|------|
| 3D 渲染帧率 | 60fps（100+ 设备） |
| 首屏加载 | < 3s |
| NL 解析延迟 | < 500ms |
| 相机动画 | 60fps 流畅 |
| 内存占用 | < 200MB |

## 4. 上线运营

### 4.1 部署架构

```
前端：Vercel（自动部署，全球 CDN）
后端：阿里云轻量（国内访问快）
数据库：Supabase（Postgres + pgvector）
监控：Sentry + PostHog
域名：自定义域名 + HTTPS
```

### 4.2 用户获取

**Day 50-60 重点**：
1. **Product Hunt 发布**：抢首页
2. **掘金技术博客**：深度技术分享
3. **V2EX / 小红书**：创意展示
4. **Twitter / 即刻**：海外曝光

**目标**：60 天内 100+ 真实用户使用

### 4.3 用户反馈循环

```
用户使用 → PostHog 收集行为 → 数据分析 → 优化迭代
                ↓
        Sentry 收集错误 → 快速修复
```

## 5. 项目里程碑

| 里程碑 | 时间 | 产出 |
|-------|------|------|
| M1 Three.js 基础 | Day 46-47 | 3D 场景搭建 |
| M2 实时数据可视化 | Day 48-49 | 设备状态 3D 展示 |
| M3 NL 操作 3D | Day 50-51 | sceneControlTools |
| M4 Agent 工作流可视化 | Day 52-53 | P3 集成 |
| M5 多模态识别 | Day 54 | 照片识别 |
| M6 监控大屏 | Day 55-56 | 大屏模式 |
| M7 性能优化 | Day 57 | 60fps 优化 |
| M8 生产部署 | Day 58 | 上线 |
| M9 用户运营 | Day 59-60 | 推广 + 反馈 |

## 6. 验收标准

- [ ] 3D 场景渲染 100+ 设备 60fps
- [ ] 自然语言操作 3D 跑通 10 个场景
- [ ] Agent 工作流 3D 可视化
- [ ] 多模态识别准确率 > 80%
- [ ] 公网 HTTPS 部署成功
- [ ] 100+ 真实用户使用
- [ ] Sentry / PostHog 数据正常
- [ ] 简历完整更新

---

**P4 项目是你的简历杀器！🚀**
