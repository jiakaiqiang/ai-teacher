// 每日学习任务推送脚本
// 功能：1) 根据 progress-enhanced.json 的 currentDay 推送任务到飞书 2) 在 docs/ 生成 md 文档
import { FeishuNotifier } from '../lib/feishu'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')

/** 单个知识点的要点速查 */
interface LearnPoint {
  title: string
  what: string
  when: string
  pitfall: string
  /** 与 React 的对比（可选） */
  vsReact?: string
}

/** 学完自测题（答案折叠） */
interface SelfCheckItem {
  q: string
  a: string
}

interface DayTask {
  day: number
  phase: string
  title: string
  goals: string[]
  /** 知识点详解，替代原来的纯标题列表 */
  learn: LearnPoint[]
  checkList: string[]
  /** 学完反问自测，验证是否真的掌握 */
  selfCheck: SelfCheckItem[]
  estimatedHours: number
  /** 用于 md 文档的扩展正文（可选） */
  notes?: string
}

// Phase 1 Week 1 任务（Day 1-7）
const TASK_PLAN: Record<number, DayTask> = {
  1: {
    day: 1,
    phase: 'Phase 1 - Week 1',
    title: 'Nuxt 项目搭建 + 首页',
    goals: ['搭好 Nuxt 4 项目脚手架', '理解 app/pages 文件路由', '首页跑起来'],
    learn: [
      {
        title: 'Nuxt 4 目录结构',
        what: 'app/ 放页面与组件，server/ 放后端接口，nuxt.config.ts 是总配置。约定优于配置，目录名即功能。',
        when: '新建项目时先把目录摸清，知道每类文件该放哪里。',
        pitfall: 'Nuxt 4 默认源码在 app/ 下，和 Nuxt 3 的根目录布局不同，老教程的路径会对不上。',
        vsReact: '类似 Next.js 的 app/ 目录约定，但 Nuxt 用 pages/ 自动生成路由，不需要手写 Router。',
      },
      {
        title: 'app/pages 文件路由',
        what: 'pages/ 下的 .vue 文件自动变成路由，index.vue → /，about.vue → /about，[id].vue → 动态参数。',
        when: '加一个新页面时，直接在 pages/ 建文件即可，不用注册路由表。',
        pitfall: '用了 pages/ 就必须在 app.vue 里放 <NuxtPage/>，否则页面不渲染。',
        vsReact: '对应 Next.js 的文件路由；React Router 则需要手动配置 <Route>。',
      },
      {
        title: '<NuxtPage> 与 app.vue',
        what: 'app.vue 是根组件，<NuxtPage/> 是路由出口，匹配到的页面会渲染在这里。',
        when: '需要全局布局（导航栏、页脚）时，把它们写在 app.vue 包住 <NuxtPage/>。',
        pitfall: '同时存在 app.vue 和 pages/index.vue 时，如果 app.vue 里没写 <NuxtPage/>，首页会被 app.vue 覆盖。',
      },
      {
        title: 'Tailwind 集成',
        what: '通过 @nuxtjs/tailwindcss 模块接入，直接在 class 里写原子类（如 flex、p-4、text-xl）。',
        when: '快速写样式、不想单独维护 css 文件时。',
        pitfall: '忘了在 nuxt.config.ts 的 modules 里加模块，class 会不生效。',
      },
    ],
    checkList: [
      'npm run dev 正常启动',
      'http://localhost:3000 渲染首页',
      '首页有 Hero/特性/统计三块',
      'git commit 提交',
    ],
    selfCheck: [
      {
        q: '不看代码，pages/about.vue 对应的访问路径是什么？为什么不用手写路由？',
        a: '路径是 /about。Nuxt 基于 pages/ 目录约定自动生成路由表，文件名即路由。',
      },
      {
        q: '首页空白、控制台无报错，最可能漏了什么？',
        a: 'app.vue 里没有放 <NuxtPage/>，导致匹配到的页面没有渲染出口。',
      },
    ],
    estimatedHours: 4,
  },
  2: {
    day: 2,
    phase: 'Phase 1 - Week 1',
    title: 'Vue 3 组合式 API + 组件拆分',
    goals: [
      '掌握 Vue 3 组合式 API（ref/reactive/computed）',
      '理解 props/emit 组件通信',
      '完成首页组件拆分（FeatureCard、StatItem）',
    ],
    learn: [
      {
        title: '<script setup> 语法',
        what: '组件顶层写逻辑的语法糖，里面声明的变量、函数、import 的组件，模板里直接能用，无需 return。',
        when: '写所有 Vue 3 组件的默认写法，比 setup() 函数更简洁。',
        pitfall: '<script setup> 里没有 this，别用选项式 API 的写法（如 this.xxx）。',
        vsReact: '类似函数组件体，但它只执行一次（不像 React 函数每次渲染都重跑），响应性靠 ref/reactive 而非重新执行。',
      },
      {
        title: 'ref vs reactive',
        what: 'ref 包装任意值（含基本类型），用 .value 读写；reactive 只接对象/数组，直接读写属性。',
        when: '基本类型、需要整体替换的值用 ref；一组相关属性的对象用 reactive。拿不准就统一用 ref。',
        pitfall: 'reactive 对象解构后丢失响应性；ref 在 <script> 里要写 .value，模板里会自动解包不用写。',
        vsReact: 'ref 像 useState，但可直接改 .value 不需 setState；reactive 没有 React 对应物，更接近可变的响应对象。',
      },
      {
        title: 'computed 计算属性',
        what: '基于已有响应式数据派生出新值，依赖变了才重新计算，结果有缓存。',
        when: '某个值是由其它状态算出来的（如总价 = 单价×数量）时用它，而不是写函数每次调用。',
        pitfall: 'computed 默认只读，别在里面改数据；依赖必须是响应式的，否则不会更新。',
        vsReact: '相当于 useMemo，但依赖自动收集，不用手写依赖数组。',
      },
      {
        title: 'props / emit 父子通信',
        what: 'props 是父传子的只读数据（defineProps），emit 是子通知父的事件（defineEmits）。',
        when: '拆组件时：父往子塞数据用 props，子要把动作/数据反馈给父用 emit。',
        pitfall: 'props 是只读的，子组件不能直接改 prop；要改就 emit 事件让父去改（单向数据流）。',
        vsReact: 'props 一样；emit 相当于父传给子的回调函数 prop，只是 Vue 用事件机制表达。',
      },
    ],
    checkList: [
      '创建 FeatureCard 组件并使用 props',
      '创建 StatItem 组件并使用 props',
      '页面效果保持不变',
      'TypeScript 无报错',
      'git commit 提交',
    ],
    selfCheck: [
      {
        q: '为什么 props 是只读的？子组件想改怎么办？',
        a: '为保证单向数据流，数据源唯一好追踪。子组件需要改时 emit 一个事件，由父组件去修改后通过 props 流回来。',
      },
      {
        q: 'reactive 包的对象解构出来后为什么不更新了？ref 有这个问题吗？',
        a: 'reactive 解构会拿到普通值，脱离响应式代理所以不更新（可用 toRefs 解决）。ref 通过 .value 持有引用，不存在解构丢响应的问题。',
      },
      {
        q: 'computed 和普通函数都能算出派生值，区别在哪？',
        a: 'computed 有缓存，依赖不变时多次访问不重算；普通函数每次调用都执行。展示派生值优先用 computed。',
      },
    ],
    estimatedHours: 4,
  },
  3: {
    day: 3,
    phase: 'Phase 1 - Week 1',
    title: 'Nuxt server API（第一个后端接口）',
    goals: ['理解 Nuxt 全栈结构', '写出第一个 GET/POST 接口', '前端用 useFetch 调通'],
    learn: [
      {
        title: 'server/api 目录约定',
        what: 'server/api/ 下的文件自动变成接口，文件名带 .get/.post 后缀决定请求方法，路径即 URL。',
        when: '需要后端逻辑（查数据库、调外部 API、藏密钥）时，在这里建文件。',
        pitfall: 'hello.get.ts 只响应 GET；用 POST 调会 405。后缀别漏写。',
        vsReact: '类似 Next.js 的 app/api/route.ts，但 Nuxt 用文件名后缀区分方法，更简洁。',
      },
      {
        title: 'defineEventHandler',
        what: '定义接口处理函数的标准写法，接收 event 参数，return 的值自动序列化为 JSON 返回。',
        when: '每个接口文件都用它包住处理逻辑。',
        pitfall: '直接 return 对象即可，不要自己 JSON.stringify，否则会被二次转义。',
      },
      {
        title: 'readBody 读取请求体',
        what: 'POST/PUT 请求里用 await readBody(event) 拿到前端发来的 JSON 数据。',
        when: '处理表单提交、接收前端参数时。',
        pitfall: 'readBody 是异步的要 await；GET 请求没有 body，参数要用 getQuery。',
      },
      {
        title: 'useFetch / $fetch 区别',
        what: 'useFetch 是组件里用的组合式封装（带缓存、SSR、loading 状态）；$fetch 是底层请求函数，可在任意地方调用。',
        when: '页面加载数据用 useFetch；事件回调里（如点按钮）发请求用 $fetch。',
        pitfall: '在 onClick 里用 useFetch 会重复触发/行为异常，事件里应该用 $fetch。',
        vsReact: 'useFetch 类似 React Query 的 useQuery（声明式、带缓存）；$fetch 类似 axios/fetch。',
      },
    ],
    checkList: [
      'server/api/hello.get.ts 返回 JSON',
      'server/api/echo.post.ts 回显请求体',
      'curl 测试通过',
      '前端页面调用接口成功',
    ],
    selfCheck: [
      {
        q: '点击按钮时发请求，应该用 useFetch 还是 $fetch？为什么？',
        a: '用 $fetch。useFetch 是为页面级数据获取设计的（带缓存和生命周期），放在事件回调里会行为异常。',
      },
      {
        q: 'POST 接口里怎么拿到前端发来的数据？GET 呢？',
        a: 'POST 用 await readBody(event) 拿 body；GET 没有 body，用 getQuery(event) 取 URL 查询参数。',
      },
    ],
    estimatedHours: 4,
  },
  4: {
    day: 4,
    phase: 'Phase 1 - Week 1',
    title: '调用大模型 API（第一个 AI 接口）',
    goals: ['打通大模型 API 调用链路', '掌握 runtimeConfig 管理密钥', '会用流式以外的基础调用'],
    learn: [
      {
        title: 'chat completions API',
        what: 'OpenAI/通义/Kimi 等都遵循 messages 数组（role: system/user/assistant）+ model 的请求格式，返回 choices。',
        when: '所有对话类 AI 调用的基础格式，先掌握非流式（一次拿全部回复）。',
        pitfall: 'messages 要带上历史才有上下文；system 角色设定人设，别全塞 user。',
      },
      {
        title: 'runtimeConfig + .env',
        what: '密钥写在 .env，通过 nuxt.config 的 runtimeConfig 读取，只在 server 端可访问。',
        when: '任何密钥、不能暴露给浏览器的配置都走这里。',
        pitfall: 'runtimeConfig 顶层只在服务端可用；放进 public 下的才会给前端，密钥千万别放 public。',
        vsReact: '类似 Next.js 的环境变量，不带 NEXT_PUBLIC_ 前缀的只在服务端可用。',
      },
      {
        title: 'server 端 $fetch 调外部 API',
        what: '在 server/api 里用 $fetch 请求大模型服务，把密钥放在请求头，前端只调你自己的接口。',
        when: '需要代理外部 AI 服务、隐藏密钥时（即 BFF 模式）。',
        pitfall: '绝不能在前端直接调大模型并带密钥，密钥会泄漏。一定走自己的 server 转发。',
      },
      {
        title: '错误处理基础',
        what: '用 try/catch 包住外部调用，失败时 createError 返回合适的状态码和信息。',
        when: 'API key 失效、超时、限流等都可能失败，需要给前端可读的错误。',
        pitfall: '别把外部 API 的原始错误（可能含密钥/内部信息）直接透传给前端。',
      },
    ],
    checkList: [
      '.env 里配好 API key（不要提交）',
      'server/api/chat.post.ts 能拿到 AI 回复',
      'curl 测试有返回',
      '密钥未泄漏到前端',
    ],
    selfCheck: [
      {
        q: '为什么不能让前端直接调用大模型 API？正确做法是什么？',
        a: '前端代码和网络请求都可见，密钥会泄漏。正确做法是前端调自己的 server 接口，由 server 带密钥转发给大模型（BFF 模式）。',
      },
      {
        q: 'AI 回复总是没有上下文、记不住前面说的话，问题在哪？',
        a: '请求时 messages 只发了当前这句，没带历史对话。需要把之前的 user/assistant 消息一起放进 messages 数组。',
      },
    ],
    estimatedHours: 5,
  },
  5: {
    day: 5,
    phase: 'Phase 1 - Week 1',
    title: '前端对话界面 + useFetch',
    goals: ['做出能用的聊天界面', '掌握 useFetch 各种用法', '处理 loading 与错误'],
    learn: [
      {
        title: 'v-model 双向绑定',
        what: '把表单输入和数据双向绑定，输入框内容变了变量自动更新，反之亦然。',
        when: '输入框、文本域等需要读取用户输入时。',
        pitfall: '组件上用 v-model 本质是 :modelValue + @update:modelValue 的语法糖，自定义组件要实现这两个才支持。',
        vsReact: 'React 是受控组件（value + onChange 手动绑），Vue 的 v-model 把这套封装成了一个指令。',
      },
      {
        title: '列表渲染 v-for',
        what: '遍历数组渲染列表，:key 给每项唯一标识帮助 diff。',
        when: '渲染消息列表、卡片列表等重复结构时。',
        pitfall: 'key 要用稳定唯一值（如 id），别用数组下标，否则增删时渲染会错乱。',
        vsReact: '对应 React 里的 array.map() + key，理念一致。',
      },
      {
        title: 'useFetch 的 lazy / immediate',
        what: 'lazy 不阻塞导航、加载后再填充；immediate: false 表示不自动请求，手动调 execute() 才发。',
        when: '聊天这种"用户触发才请求"的场景，用 immediate:false + execute 控制时机。',
        pitfall: '默认 useFetch 会立即且阻塞执行，聊天场景不设置会一进页面就空请求。',
      },
      {
        title: 'loading 与 error 状态',
        what: 'useFetch 返回 { data, pending, error, execute }，pending 控制 loading UI，error 显示错误。',
        when: '任何异步请求都要处理这三态，给用户反馈。',
        pitfall: '别只处理成功路径；请求中要禁用按钮/显示 loading，失败要给提示，否则体验很差。',
      },
    ],
    checkList: [
      'pages/chat.vue 页面可用',
      '能连续多轮对话',
      '有 loading 提示',
      '错误有提示',
    ],
    selfCheck: [
      {
        q: '聊天页面一打开就自动发了一次空请求，怎么改？',
        a: 'useFetch 默认 immediate 立即执行。设置 immediate: false，改为用户点发送时调用 execute()（或改用 $fetch）。',
      },
      {
        q: 'v-for 为什么要写 :key？用数组下标当 key 有什么风险？',
        a: 'key 帮助 Vue 高效 diff 复用节点。用下标当 key，在列表中间增删时下标会变，导致状态/DOM 错位。应该用稳定的唯一 id。',
      },
    ],
    estimatedHours: 4,
  },
  6: {
    day: 6,
    phase: 'Phase 1 - Week 1',
    title: '流式输出（Streaming）',
    goals: ['理解 SSE / ReadableStream', '改造接口为流式', '前端打字机效果'],
    learn: [
      {
        title: 'SSE 协议',
        what: 'Server-Sent Events，服务器通过一个长连接持续往客户端推数据，单向、基于 HTTP、格式为 data: xxx\\n\\n。',
        when: 'AI 逐字返回、实时通知等"服务器持续推、客户端只收"的场景。',
        pitfall: 'SSE 是单向（服务器→客户端）；需要双向用 WebSocket。大模型流式通常用 SSE 即可。',
      },
      {
        title: 'ReadableStream API',
        what: '浏览器/服务端表示可逐块读取的数据流，配合 reader.read() 循环消费。',
        when: '处理流式响应、大文件分块时。',
        pitfall: 'read() 返回 { value, done }，要循环到 done 为 true；忘了处理 done 会死循环或漏数据。',
      },
      {
        title: '后端流式返回',
        what: '把大模型的 stream:true 响应逐块转发给前端，server 端返回一个流而非完整 JSON。',
        when: '改造 chat 接口让回复边生成边显示时。',
        pitfall: '要设置正确的响应头（如 text/event-stream），并逐块 flush，否则会被缓冲成一次性返回。',
      },
      {
        title: '前端逐块读取',
        what: '前端读取流、把每个 chunk 追加到消息内容上，配合响应式实现打字机效果。',
        when: '展示 AI 逐字输出时。',
        pitfall: 'chunk 可能不是完整的一条数据，需要做拼接/按分隔符切分，否则会出现乱码或断句。',
      },
    ],
    checkList: [
      '/api/chat 改为流式',
      '前端逐字显示',
      '中断/超时处理',
    ],
    selfCheck: [
      {
        q: 'SSE 和 WebSocket 都能实时推送，AI 流式输出为什么常用 SSE？',
        a: 'AI 流式只需服务器单向往客户端推 token，SSE 单向、基于普通 HTTP、实现简单且自带重连，足够用；双向交互才需要 WebSocket。',
      },
      {
        q: '后端明明逐块返回了，前端却一次性收到全部内容，可能哪里错了？',
        a: '响应被缓冲了。需要设置流式响应头（text/event-stream）并逐块 flush，中间不要等全部生成完再返回。',
      },
    ],
    estimatedHours: 5,
  },
  7: {
    day: 7,
    phase: 'Phase 1 - Week 1',
    title: 'Week 1 小结 + Lighthouse 接入起步',
    goals: ['理解性能指标', '跑通 lighthouse 命令行', '写出 analyze 接口'],
    learn: [
      {
        title: 'lighthouse npm 包',
        what: '可编程调用的网页性能分析工具，输入 URL，输出性能/可访问性/SEO 等评分和详细指标。',
        when: '要在自己的服务里自动化跑性能检测时。',
        pitfall: 'lighthouse 依赖无头 Chrome，服务器环境要装好 Chrome/chromium，否则启动失败。',
      },
      {
        title: 'FCP/LCP/CLS/TTI 指标',
        what: 'FCP 首次内容绘制、LCP 最大内容绘制、CLS 累积布局偏移、TTI 可交互时间，是衡量加载体验的核心指标。',
        when: '解读 lighthouse 报告、定位性能问题时。',
        pitfall: '别只看总分；要看具体哪项拖后腿（如 LCP 大多是图片/字体没优化，CLS 多是无尺寸的图片或广告位）。',
      },
      {
        title: 'analyze.post.ts 接口设计',
        what: '前端传 URL，server 调 lighthouse 跑分，提取关键指标返回给前端展示。',
        when: '把命令行能力封装成产品功能时。',
        pitfall: 'lighthouse 跑一次较慢（数秒到数十秒），接口要考虑超时、并发限制，别让请求堆积。',
      },
      {
        title: 'Week 1 复盘',
        what: '回顾本周学的 Nuxt 路由、组合式 API、server 接口、AI 调用、流式，串成完整链路。',
        when: '每周结束时做，查漏补缺、巩固知识网络。',
        pitfall: '复盘别只列做了什么，重点是找出还没真正理解的点，下周补上。',
      },
    ],
    checkList: [
      '本地能跑 lighthouse 命令',
      'server/api/analyze.post.ts 返回真实数据',
      'Week 1 复盘文档',
    ],
    selfCheck: [
      {
        q: '一个页面 lighthouse 总分不高，LCP 指标很差，通常先查什么？',
        a: 'LCP 是最大内容元素的绘制时间，多半是首屏大图、字体加载慢或服务器响应慢，先优化图片（压缩/懒加载/预加载）和资源加载。',
      },
      {
        q: 'analyze 接口直接同步跑 lighthouse 有什么风险？怎么缓解？',
        a: '单次分析耗时长，并发请求会拖垮服务、造成超时。可加超时控制、并发限制或改为任务队列/异步返回结果。',
      },
    ],
    estimatedHours: 5,
  },
}

interface Progress {
  currentDay: number
  startDate: string
  lastReminderDate: string | null
}

async function loadProgress(): Promise<Progress> {
  const raw = await fs.readFile(join(ROOT, 'progress-enhanced.json'), 'utf-8')
  return JSON.parse(raw)
}

async function saveProgress(progress: Progress): Promise<void> {
  const path = join(ROOT, 'progress-enhanced.json')
  const raw = await fs.readFile(path, 'utf-8')
  const obj = JSON.parse(raw)
  obj.lastReminderDate = progress.lastReminderDate
  obj.currentDay = progress.currentDay
  await fs.writeFile(path, JSON.stringify(obj, null, 2), 'utf-8')
}

function todayDateStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 根据当前日期与起始日期计算今天是第几天（1 起算） */
function calcCurrentDay(startDate: string): number {
  const start = new Date(startDate + 'T00:00:00')
  const now = new Date(todayDateStr() + 'T00:00:00')
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return diff + 1
}

function buildMarkdown(task: DayTask, dateStr: string): string {
  const goals = task.goals.map(g => `- ${g}`).join('\n')
  const learn = task.learn
    .map((p, i) => {
      const lines = [
        `### ${i + 1}. ${p.title}`,
        '',
        `- **是什么**：${p.what}`,
        `- **何时用**：${p.when}`,
        `- **易错点**：${p.pitfall}`,
      ]
      if (p.vsReact) lines.push(`- **对比 React**：${p.vsReact}`)
      return lines.join('\n')
    })
    .join('\n\n')
  const checks = task.checkList.map(c => `- [ ] ${c}`).join('\n')
  const selfCheck = task.selfCheck
    .map(
      (s, i) =>
        `${i + 1}. ${s.q}\n   <details><summary>点开看答案</summary>\n\n   ${s.a}\n   </details>`,
    )
    .join('\n\n')

  return `# Day ${task.day} — ${task.title}

> 📅 日期：${dateStr}
> ⏰ 预计时长：${task.estimatedHours} 小时
> 📂 项目目录：\`D:/demo/lighthouse-ai-nuxt\`
> 🎯 阶段：${task.phase}（Day ${task.day}/70）

---

## 🎯 今日目标

${goals}

---

## 📚 学（知识点速查）

${learn}

---

## 💻 做 + ✅ 验

${checks}

---

## 🧠 自测（学完先别看答案，自己答一遍）

> 答不上来就回到「📚 学」对应小节再过一遍，再动手做。

${selfCheck}

---

## 📝 记

完成后：

\`\`\`bash
cd D:/demo/lighthouse-ai-nuxt
git add .
git commit -m "Day${task.day}: ${task.title}"
\`\`\`

简短记录学习笔记（写在项目内 \`notes/day${task.day}.md\` 或 README）。

---

## 📊 进度

\`\`\`
当前进度：Day ${task.day} / 70
\`\`\`
${task.notes ? `\n---\n\n## 补充说明\n\n${task.notes}\n` : ''}
`
}

async function ensureDocsDir(): Promise<string> {
  const docsDir = join(ROOT, 'docs')
  await fs.mkdir(docsDir, { recursive: true })
  return docsDir
}

async function generateMarkdown(task: DayTask, dateStr: string): Promise<string> {
  const docsDir = await ensureDocsDir()
  const filename = `day${task.day}-${dateStr}.md`
  const filepath = join(docsDir, filename)
  const md = buildMarkdown(task, dateStr)
  await fs.writeFile(filepath, md, 'utf-8')
  return filepath
}

async function main() {
  console.log('🚀 开始推送每日学习任务...\n')

  const progress = await loadProgress()
  const dateStr = todayDateStr()
  const currentDay = calcCurrentDay(progress.startDate)

  console.log(`📅 今天是 ${dateStr}，第 ${currentDay} 天`)

  const task = TASK_PLAN[currentDay]
  if (!task) {
    console.warn(`⚠️ 任务清单中没有 Day ${currentDay} 的任务，请补充 TASK_PLAN`)
    process.exit(1)
  }

  // 1. 生成 md 文档
  const mdPath = await generateMarkdown(task, dateStr)
  console.log(`📄 已生成任务文档：${mdPath}`)

  // 2. 推送飞书
  const envPath = join(ROOT, '.env.local')
  const envContent = await fs.readFile(envPath, 'utf-8')
  const webhookMatch = envContent.match(/FEISHU_WEBHOOK_URL=(.+)/)
  if (!webhookMatch) {
    console.error('❌ 未找到飞书 webhook 配置')
    process.exit(1)
  }
  const webhookUrl = webhookMatch[1].trim()
  console.log('✅ 找到飞书 webhook 配置')

  const notifier = new FeishuNotifier(webhookUrl)
  console.log(`📤 推送 Day ${task.day} 学习任务到飞书...`)
  await notifier.sendDailyTask(task.day, task.phase, {
    title: task.title,
    goals: task.goals,
    content: task.learn.map(p => p.title),
    checkList: task.checkList,
    estimatedHours: task.estimatedHours,
  })

  // 3. 更新 progress
  progress.lastReminderDate = dateStr
  progress.currentDay = currentDay
  await saveProgress(progress)

  console.log('\n✅ 推送完成！')
  console.log(`🎯 Day ${task.day} 任务：${task.title}`)
  console.log(`⏰ 预计时间：${task.estimatedHours} 小时`)
  console.log(`📄 文档路径：docs/day${task.day}-${dateStr}.md`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ 推送失败:', error)
    process.exit(1)
  })