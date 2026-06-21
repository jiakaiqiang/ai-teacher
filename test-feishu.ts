import { FeishuNotifier } from './lib/feishu'

async function test() {
  console.log('🚀 开始测试飞书推送...\n')

  const notifier = new FeishuNotifier('https://open.feishu.cn/open-apis/bot/v2/hook/bb2d3b5e-cc77-41e6-a261-89529ac6456b')

  // 1. 发送欢迎消息
  console.log('📤 发送欢迎消息...')
  await notifier.sendText('🎉 AI学习导师已成功接入飞书！\n\n明天早上9:04会推送第一天的学习任务，加油！💪')

  await sleep(2000)

  // 2. 发送Day 1学习任务示例
  console.log('📤 发送Day 1学习任务示例...')
  await notifier.sendDailyTask(1, 'Phase 1 - Week 1', {
    title: 'Next.js快速入门',
    goals: [
      '掌握Next.js 14基础概念',
      '创建lighthouse-ai-analyzer项目',
      '完成首页开发'
    ],
    content: [
      'Next.js 14新特性（App Router）',
      'TypeScript配置',
      'Tailwind CSS集成',
      '项目目录结构'
    ],
    checkList: [
      '项目创建成功',
      '首页渲染正常',
      '代码已提交GitHub',
      '运行npm run dev无报错'
    ],
    estimatedHours: 6
  })

  await sleep(2000)

  // 3. 发送Day 1学习报告示例
  console.log('📤 发送Day 1学习报告示例...')
  await notifier.sendDailyReport(1, {
    completedTasks: [
      '✅ 创建了Next.js项目',
      '✅ 完成了首页开发',
      '✅ 集成了Tailwind CSS',
      '✅ 提交到GitHub'
    ],
    score: 9,
    highlights: [
      '🌟 Next.js学习很快上手',
      '🌟 代码质量不错，注释清晰',
      '🌟 有使用Claude Code加速开发'
    ],
    issues: [],
    suggestions: [
      '💡 TypeScript可以用得更深入一些',
      '💡 建议添加README文档',
      '💡 可以考虑添加ESLint配置'
    ],
    skillProgress: {
      'nextjs': 15,
      'typescript': 45,
      'ai-integration': 0
    }
  })

  console.log('\n✅ 测试完成！')
  console.log('\n📱 请检查你的飞书群，应该收到了3条消息：')
  console.log('   1️⃣ 欢迎消息')
  console.log('   2️⃣ Day 1学习任务卡片')
  console.log('   3️⃣ Day 1学习报告卡片')
  console.log('\n🎯 如果收到了，说明配置成功！')
  console.log('🎯 明天早上9:04会自动推送真实的Day 1任务！')
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

test()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ 测试失败:', error)
    process.exit(1)
  })
