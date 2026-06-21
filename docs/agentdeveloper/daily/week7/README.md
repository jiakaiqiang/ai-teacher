# Week 7 (Day 46-52)：P4 启动 - 3D 场景搭建

## 📅 本周目标

启动 P4 项目，掌握 Three.js 3D 渲染，实现 3D 机房可视化与 AI 联动。

## 📊 每日计划

### Day 46（周一）· 2 小时：Three.js 入门

**学习重点**：
- Three.js 核心概念（Scene/Camera/Renderer）
- 基础几何体与材质
- 光照系统

**编码任务**：
```typescript
import * as THREE from 'three';

// 1. 场景
const scene = new THREE.Scene();

// 2. 相机
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// 3. 渲染器
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 4. 创建立方体
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// 5. 渲染循环
function animate() {
  requestAnimationFrame(animate);
  cube.rotation.x += 0.01;
  renderer.render(scene, camera);
}
animate();
```

**产出**：
- [ ] Three.js 安装
- [ ] 第一个 3D 场景
- [ ] 旋转立方体

---

### Day 47（周二）· 2 小时：3D 机房模型

**任务**：
- 设计机房布局
- 服务器机柜模型
- 光照与阴影

**核心代码**：
```typescript
// 机房地板
const floorGeometry = new THREE.PlaneGeometry(50, 30);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// 服务器机柜
function createRack(position: THREE.Vector3) {
  const group = new THREE.Group();
  
  // 机柜框架
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 2, 1),
    new THREE.MeshStandardMaterial({ color: 0x444444 })
  );
  frame.castShadow = true;
  group.add(frame);
  
  // 机柜内部服务器
  for (let i = 0; i < 20; i++) {
    const server = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.04, 0.95),
      new THREE.MeshStandardMaterial({ 
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 0.2,
      })
    );
    server.position.y = i * 0.05 - 0.95;
    group.add(server);
  }
  
  group.position.copy(position);
  return group;
}

// 创建多个机柜
for (let i = 0; i < 5; i++) {
  for (let j = 0; j < 3; j++) {
    const rack = createRack(new THREE.Vector3(i * 1, 1, j * 1.5));
    scene.add(rack);
  }
}
```

**产出**：
- [ ] 完整机房模型
- [ ] 15 个机柜（每个 20 台服务器）
- [ ] 真实感光照

---

### Day 48（周三）· 2 小时：Vue 3 集成 Three.js

**任务**：
- Vue 3 中使用 Three.js
- 响应式数据驱动 3D
- 性能优化

**核心代码**：
```vue
<!-- ServerRoom3D.vue -->
<template>
  <div ref="container" class="three-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as THREE from 'three';

const props = defineProps<{
  servers: Server[];
  anomalies: Anomaly[];
}>();

const container = ref<HTMLDivElement>();
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let serverMeshes: Map<string, THREE.Mesh> = new Map();

onMounted(() => {
  initScene();
  buildServerRoom();
  animate();
});

// 监听异常变化，更新 3D 场景
watch(() => props.anomalies, (anomalies) => {
  // 重置所有服务器颜色
  serverMeshes.forEach((mesh) => {
    mesh.material.color.set(0x10b981);
  });
  
  // 异常服务器变红
  anomalies.forEach((a) => {
    const mesh = serverMeshes.get(a.serverId);
    if (mesh) {
      mesh.material.color.set(0xef4444);
    }
  });
}, { deep: true });

function initScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, container.value!.clientWidth / container.value!.clientHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.value!.clientWidth, container.value!.clientHeight);
  container.value!.appendChild(renderer.domElement);
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

onUnmounted(() => {
  renderer.dispose();
});
</script>
```

**产出**：
- [ ] Vue 3 + Three.js 集成
- [ ] 数据驱动 3D 更新
- [ ] 异常实时反映到 3D

---

### Day 49（周四）· 2 小时：交互与相机控制

**任务**：
- OrbitControls（鼠标拖拽旋转）
- 射线检测（点击设备）
- 相机动画（飞行到目标）

**核心代码**：
```typescript
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import gsap from 'gsap';

// 1. 相机控制
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// 2. 射线检测
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseClick(event: MouseEvent) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);
  
  if (intersects.length > 0) {
    const clicked = intersects[0].object;
    if (clicked.userData.serverId) {
      handleServerClick(clicked.userData.serverId);
    }
  }
}

window.addEventListener('click', onMouseClick);

// 3. 相机动画
function flyTo(target: THREE.Vector3) {
  gsap.to(camera.position, {
    x: target.x + 2,
    y: target.y + 2,
    z: target.z + 2,
    duration: 2,
    ease: 'power2.inOut',
    onUpdate: () => {
      camera.lookAt(target);
    },
  });
}
```

**产出**：
- [ ] 相机控制流畅
- [ ] 点击设备弹出详情
- [ ] 相机飞行动画

---

### Day 50（周五）· 2 小时：自然语言操作 3D

**任务**：
- sceneControlTools 工具集
- Agent 集成
- 测试场景

**核心代码**：
```typescript
const sceneControlTools = {
  moveCameraTo: tool({
    description: '移动相机到指定位置',
    parameters: z.object({
      target: z.string().describe('room:roomA / server:srv-001'),
    }),
    execute: async ({ target }) => {
      const position = resolveTarget(target);
      sceneController.flyTo(position);
      return { moved: true };
    },
  }),
  
  highlightDevices: tool({
    description: '高亮显示设备',
    parameters: z.object({
      serverIds: z.array(z.string()),
    }),
    execute: async ({ serverIds }) => {
      sceneController.highlight(serverIds);
      return { count: serverIds.length };
    },
  }),
};
```

**测试场景**：
```
"看看 srv-001"
→ moveCameraTo('server:srv-001')

"哪些服务器有异常"
→ getAnomalies() + highlightDevices(异常列表)

"展示整体"
→ moveCameraTo('overview')
```

**产出**：
- [ ] 工具集实现
- [ ] 10 个测试场景通过
- [ ] AI 自然语言控制 3D

---

### Day 51（周六）· 6 小时：实时数据可视化

**任务**：
- 实时指标驱动 3D 状态
- 异常粒子特效
- 数据流动效果

**核心代码**：
```typescript
// 异常粒子效果
function createAlertParticles(position: THREE.Vector3) {
  const geometry = new THREE.BufferGeometry();
  const particleCount = 100;
  const positions = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 2;
    positions[i * 3 + 1] = Math.random() * 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const material = new THREE.PointsMaterial({
    color: 0xff0000,
    size: 0.05,
    transparent: true,
    opacity: 0.8,
  });
  
  const particles = new THREE.Points(geometry, material);
  particles.position.copy(position);
  return particles;
}

// 服务器状态闪烁
function updateServerEmission(server: THREE.Mesh, hasAnomaly: boolean) {
  const time = Date.now() * 0.001;
  if (hasAnomaly) {
    server.material.emissiveIntensity = Math.sin(time * 5) * 0.5 + 0.5;
  } else {
    server.material.emissiveIntensity = 0.2;
  }
}
```

**产出**：
- [ ] 异常粒子特效
- [ ] 服务器状态实时反映
- [ ] 视觉效果震撼

---

### Day 52（周日）· 6 小时：Agent 工作流可视化

**任务**：
- 4 个 Agent 在 3D 场景中位置
- 消息传递粒子动画
- 工作流状态展示

**核心代码**：
```typescript
const agentPositions = {
  monitor: new THREE.Vector3(-10, 5, 0),
  diagnose: new THREE.Vector3(-3, 5, 0),
  repair: new THREE.Vector3(3, 5, 0),
  verify: new THREE.Vector3(10, 5, 0),
};

// Agent 节点
function createAgentNode(name: string, position: THREE.Vector3) {
  const geometry = new THREE.SphereGeometry(0.5, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color: 0x4f46e5,
    emissive: 0x4f46e5,
    emissiveIntensity: 0.3,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.userData.agentName = name;
  return mesh;
}

// 消息粒子
function createMessageFlow(from: THREE.Vector3, to: THREE.Vector3) {
  const curve = new THREE.LineCurve3(from, to);
  const tube = new THREE.TubeGeometry(curve, 20, 0.05, 8);
  const material = new THREE.MeshBasicMaterial({
    color: 0x60a5fa,
    transparent: true,
    opacity: 0.6,
  });
  return new THREE.Mesh(tube, material);
}
```

**产出**：
- [ ] 4 个 Agent 节点可见
- [ ] 消息流动可视化
- [ ] Week 7 复盘

---

## ✅ Week 7 验收清单

- [ ] Three.js 完全掌握
- [ ] 3D 机房模型完整
- [ ] Vue 3 + Three.js 集成
- [ ] 自然语言操作 3D 跑通
- [ ] 实时数据可视化
- [ ] Agent 工作流 3D 展示

## 🚀 下周预告

**Week 8（Day 53-60）**：P4 完成 + 上线运营
- Day 53-54：多模态识别
- Day 55-56：监控大屏模式
- Day 57：性能优化
- Day 58-59：生产部署 + 用户运营
- Day 60：60 天总复盘

---

**Week 7 完成！🎉 进入最后冲刺！**
