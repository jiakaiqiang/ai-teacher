# Phase 2 Week 5：全栈项目实战（Day 29-35）

## 项目：AI智能笔记应用（生产级全栈项目）

### 技术栈
```
前端：Next.js 14 + TypeScript + Tailwind CSS
后端：Next.js API Routes + Prisma
数据库：PostgreSQL + Redis
AI：OpenAI API + Streaming
实时：WebSocket (Pusher/Ably)
部署：Vercel + Railway
```

---

## Day 29：项目架构和数据库设计（6小时）

### 数据库Schema设计

```prisma
// prisma/schema.prisma

// 用户表
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  name          String
  avatar        String?
  hashedPassword String?
  
  notes         Note[]
  folders       Folder[]
  tags          Tag[]
  collaborations Collaboration[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@map("users")
}

// 文件夹表
model Folder {
  id          String   @id @default(uuid())
  name        String
  parentId    String?
  
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  parent      Folder?  @relation("FolderHierarchy", fields: [parentId], references: [id])
  children    Folder[] @relation("FolderHierarchy")
  
  notes       Note[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([userId])
  @@map("folders")
}

// 笔记表
model Note {
  id          String   @id @default(uuid())
  title       String
  content     String   @db.Text  // Markdown内容
  
  // 元数据
  isPublic    Boolean  @default(false)
  isPinned    Boolean  @default(false)
  wordCount   Int      @default(0)
  
  // 关联
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  folderId    String?
  folder      Folder?  @relation(fields: [folderId], references: [id], onDelete: SetNull)
  
  tags        Tag[]
  versions    Version[]
  collaborations Collaboration[]
  
  // 时间戳
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  lastViewedAt DateTime @default(now())
  
  @@index([userId, updatedAt(sort: Desc)])
  @@index([userId, isPinned])
  @@fulltext([title, content])  // 全文搜索索引
  @@map("notes")
}

// 标签表
model Tag {
  id        String   @id @default(uuid())
  name      String
  color     String   @default("#gray")
  
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  notes     Note[]
  
  createdAt DateTime @default(now())
  
  @@unique([userId, name])
  @@map("tags")
}

// 版本历史表
model Version {
  id        String   @id @default(uuid())
  title     String
  content   String   @db.Text
  
  noteId    String
  note      Note     @relation(fields: [noteId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  
  @@index([noteId, createdAt(sort: Desc)])
  @@map("versions")
}

// 协作表
model Collaboration {
  id         String   @id @default(uuid())
  role       Role     @default(VIEWER)
  
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  noteId     String
  note       Note     @relation(fields: [noteId], references: [id], onDelete: Cascade)
  
  createdAt  DateTime @default(now())
  
  @@unique([userId, noteId])
  @@map("collaborations")
}

enum Role {
  VIEWER
  EDITOR
  OWNER
}
```

### 项目架构

```
app/
├── (auth)/
│   ├── login/
│   └── register/
├── (dashboard)/
│   ├── layout.tsx          # Dashboard布局
│   ├── page.tsx            # 笔记列表
│   ├── notes/
│   │   ├── [id]/           # 笔记详情
│   │   └── new/            # 新建笔记
│   └── folders/
│       └── [id]/           # 文件夹视图
├── api/
│   ├── auth/[...nextauth]/ # 认证
│   ├── notes/              # 笔记CRUD
│   ├── ai/
│   │   ├── complete/       # AI续写
│   │   ├── rewrite/        # AI改写
│   │   └── summarize/      # AI总结
│   ├── search/             # 全文搜索
│   └── realtime/           # WebSocket连接
lib/
├── db/
│   ├── prisma.ts
│   └── repositories/
│       ├── note.repository.ts
│       ├── folder.repository.ts
│       └── tag.repository.ts
├── services/
│   ├── note.service.ts
│   ├── ai.service.ts
│   ├── search.service.ts
│   └── realtime.service.ts
├── cache/
│   └── redis.ts
└── utils/
    ├── markdown.ts
    └── validation.ts
```

---

## Day 30：编辑器集成（6小时）

### TipTap编辑器集成

```typescript
// components/editor/Editor.tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { useEffect } from 'react'

interface EditorProps {
  content: string
  onChange: (content: string) => void
  onAiComplete?: () => void
}

export function Editor({ content, onChange, onAiComplete }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '开始写作，按 Ctrl+K 使用AI...',
      }),
      CharacterCount,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
      handleKeyDown: (view, event) => {
        // Ctrl+K 触发AI
        if (event.ctrlKey && event.key === 'k') {
          event.preventDefault()
          onAiComplete?.()
          return true
        }
        return false
      },
    },
  })

  return (
    <div className="relative">
      <EditorContent editor={editor} />
      
      {editor && (
        <div className="absolute bottom-4 right-4 text-sm text-gray-500">
          {editor.storage.characterCount.words()} 字
        </div>
      )}
    </div>
  )
}

// components/editor/Toolbar.tsx
export function Toolbar({ editor }: { editor: any }) {
  if (!editor) return null

  return (
    <div className="flex gap-2 p-2 border-b">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'is-active' : ''}
      >
        粗体
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'is-active' : ''}
      >
        斜体
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
      >
        标题
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'is-active' : ''}
      >
        列表
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={editor.isActive('codeBlock') ? 'is-active' : ''}
      >
        代码块
      </button>
    </div>
  )
}
```

### 自动保存

```typescript
// hooks/useAutoSave.ts
import { useEffect, useRef } from 'react'
import { useDebouncedCallback } from 'use-debounce'

export function useAutoSave(
  content: string,
  onSave: (content: string) => Promise<void>,
  delay: number = 2000
) {
  const isSaving = useRef(false)
  const lastSaved = useRef<string>(content)

  const debouncedSave = useDebouncedCallback(
    async (content: string) => {
      if (content === lastSaved.current || isSaving.current) {
        return
      }

      isSaving.current = true
      try {
        await onSave(content)
        lastSaved.current = content
      } catch (error) {
        console.error('保存失败:', error)
      } finally {
        isSaving.current = false
      }
    },
    delay
  )

  useEffect(() => {
    debouncedSave(content)
  }, [content, debouncedSave])

  return { isSaving: isSaving.current }
}

// 使用
export function NotePage({ note }: { note: Note }) {
  const [content, setContent] = useState(note.content)
  
  const { isSaving } = useAutoSave(content, async (newContent) => {
    await fetch(`/api/notes/${note.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ content: newContent }),
    })
  })

  return (
    <div>
      {isSaving && <span>保存中...</span>}
      <Editor content={content} onChange={setContent} />
    </div>
  )
}
```

---

## Day 31-32：AI功能实现（12小时）

### AI Service架构

```typescript
// lib/services/ai.service.ts
import OpenAI from 'openai'

export class AIService {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  // AI续写
  async complete(context: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的写作助手。根据用户提供的内容，自然地续写下文。保持风格一致，逻辑连贯。',
        },
        {
          role: 'user',
          content: `请续写以下内容：\n\n${context}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    return response.choices[0].message.content || ''
  }

  // AI改写
  async rewrite(text: string, style: 'professional' | 'casual' | 'concise'): Promise<string> {
    const stylePrompts = {
      professional: '改写为专业、正式的风格',
      casual: '改写为轻松、口语化的风格',
      concise: '精简内容，保留核心信息',
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `你是一个文本改写专家。${stylePrompts[style]}。`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.5,
    })

    return response.choices[0].message.content || ''
  }

  // AI总结
  async summarize(text: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的内容总结助手。请用简洁的语言总结要点，3-5条bullet points。',
        },
        {
          role: 'user',
          content: `请总结以下内容：\n\n${text}`,
        },
      ],
      temperature: 0.3,
    })

    return response.choices[0].message.content || ''
  }

  // Streaming续写
  async *completeStream(context: string): AsyncGenerator<string> {
    const stream = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的写作助手。',
        },
        {
          role: 'user',
          content: `请续写以下内容：\n\n${context}`,
        },
      ],
      temperature: 0.7,
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  }
}
```

### API Routes实现

```typescript
// app/api/ai/complete/route.ts
import { AIService } from '@/lib/services/ai.service'
import { getServerSession } from 'next-auth'

export async function POST(req: Request) {
  const session = await getServerSession()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { context } = await req.json()
  
  if (!context) {
    return new Response('Missing context', { status: 400 })
  }

  const aiService = new AIService()

  // 使用Streaming响应
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of aiService.completeStream(context)) {
          controller.enqueue(encoder.encode(chunk))
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}

// app/api/ai/rewrite/route.ts
export async function POST(req: Request) {
  const session = await getServerSession()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { text, style } = await req.json()
  
  const aiService = new AIService()
  const result = await aiService.rewrite(text, style)
  
  return Response.json({ result })
}

// app/api/ai/summarize/route.ts
export async function POST(req: Request) {
  const session = await getServerSession()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { text } = await req.json()
  
  const aiService = new AIService()
  const result = await aiService.summarize(text)
  
  return Response.json({ result })
}
```

### 前端集成

```typescript
// hooks/useAI.ts
export function useAI() {
  const [isLoading, setIsLoading] = useState(false)

  const complete = async (context: string, onChunk: (chunk: string) => void) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/ai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader!.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        onChunk(chunk)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const rewrite = async (text: string, style: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, style }),
      })
      const data = await response.json()
      return data.result
    } finally {
      setIsLoading(false)
    }
  }

  return { complete, rewrite, isLoading }
}

// 使用
export function Editor() {
  const { complete, isLoading } = useAI()
  const [content, setContent] = useState('')

  const handleAIComplete = async () => {
    await complete(content, (chunk) => {
      setContent(prev => prev + chunk)
    })
  }

  return (
    <div>
      <button onClick={handleAIComplete} disabled={isLoading}>
        {isLoading ? 'AI生成中...' : 'AI续写'}
      </button>
      <Editor content={content} onChange={setContent} />
    </div>
  )
}
```

---

## Day 33：全文搜索（6小时）

```typescript
// lib/services/search.service.ts
export class SearchService {
  // PostgreSQL全文搜索
  async searchNotes(userId: string, query: string) {
    return await prisma.$queryRaw`
      SELECT 
        id,
        title,
        content,
        ts_rank(
          to_tsvector('english', title || ' ' || content),
          plainto_tsquery('english', ${query})
        ) as rank
      FROM notes
      WHERE user_id = ${userId}
      AND (
        to_tsvector('english', title || ' ' || content) @@
        plainto_tsquery('english', ${query})
      )
      ORDER BY rank DESC
      LIMIT 20
    `
  }

  // 简单的中文分词搜索
  async searchNotesChinese(userId: string, query: string) {
    const keywords = query.split(/\s+/)
    
    const orConditions = keywords.flatMap(keyword => [
      { title: { contains: keyword } },
      { content: { contains: keyword } },
    ])

    return await prisma.note.findMany({
      where: {
        userId,
        OR: orConditions,
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    })
  }
}

// API实现
// app/api/search/route.ts
export async function GET(req: Request) {
  const session = await getServerSession()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q') || ''

  const searchService = new SearchService()
  const results = await searchService.searchNotesChinese(
    session.user.id,
    query
  )

  return Response.json(results)
}
```

---

## Day 34-35：部署和优化（12小时）

### 性能优化清单

```typescript
// 1. 图片优化
import Image from 'next/image'

<Image
  src="/avatar.jpg"
  alt="Avatar"
  width={40}
  height={40}
  priority // 关键图片
/>

// 2. 字体优化
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

// 3. 代码分割
const Editor = dynamic(() => import('@/components/Editor'), {
  ssr: false,
  loading: () => <p>加载编辑器...</p>,
})

// 4. API响应缓存
export async function GET(req: Request) {
  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate',
    },
  })
}
```

### 部署到Vercel

```bash
# 1. 安装Vercel CLI
npm i -g vercel

# 2. 部署
vercel

# 3. 配置环境变量
vercel env add DATABASE_URL
vercel env add REDIS_URL
vercel env add OPENAI_API_KEY
vercel env add NEXTAUTH_SECRET
```

---

## Week 5 验收标准

### 功能完整性
- [ ] 用户认证和注册
- [ ] 笔记CRUD
- [ ] 文件夹管理
- [ ] 标签系统
- [ ] AI续写/改写/总结
- [ ] 全文搜索
- [ ] 自动保存

### 性能指标
- [ ] 首屏加载<2s
- [ ] API响应<200ms
- [ ] AI响应使用Streaming
- [ ] 数据库查询优化

### 代码质量
- [ ] TypeScript无错误
- [ ] 分层架构清晰
- [ ] 有错误处理
- [ ] 有日志记录

### 部署
- [ ] 成功部署到Vercel
- [ ] 数据库迁移成功
- [ ] 环境变量配置正确
- [ ] 线上功能正常

---

## Phase 2 总结

完成Week 4-5后，你将掌握：

### 硬技能
- ✅ 数据库设计（三范式、索引、关系）
- ✅ Redis缓存策略（防穿透、雪崩、击穿）
- ✅ 后端架构（分层、依赖注入、IoC）
- ✅ 性能优化（数据库、API、缓存）
- ✅ 可观测性（日志、监控、追踪）
- ✅ 全栈项目实战

### 项目成果
1. lighthouse-ai-analyzer（加强版，有数据库+缓存）
2. AI智能笔记（完整的全栈项目）

### 能力提升
- 数据库设计：0% → 70%
- 后端架构：20% → 75%
- 缓存策略：0% → 80%
- 性能优化：70% → 90%
- 全栈开发：20% → 75%

**你已经从前端工程师升级为全栈工程师！** 🚀
