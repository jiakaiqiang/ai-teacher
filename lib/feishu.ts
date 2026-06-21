// 飞书消息发送工具
import fs from 'fs/promises'

interface FeishuMessageCard {
  msg_type: 'interactive'
  card: {
    header: {
      title: {
        tag: 'plain_text'
        content: string
      }
      template?: string
    }
    elements: Array<{
      tag: string
      text?: {
        tag: 'lark_md' | 'plain_text'
        content: string
      }
      fields?: Array<{
        is_short: boolean
        text: {
          tag: 'lark_md' | 'plain_text'
          content: string
        }
      }>
    }>
  }
}

export class FeishuNotifier {
  private webhookUrl: string

  constructor(webhookUrl?: string) {
    this.webhookUrl = webhookUrl || process.env.FEISHU_WEBHOOK_URL || ''
  }

  // 发送每日学习任务
  async sendDailyTask(day: number, phase: string, task: {
    title: string
    goals: string[]
    content: string[]
    checkList: string[]
    estimatedHours: number
  }) {
    if (!this.webhookUrl) {
      console.log('⚠️ 未配置飞书webhook，跳过推送')
      return
    }

    const message: FeishuMessageCard = {
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: `🌅 Day ${day} 学习任务 - ${phase}`
          },
          template: 'blue'
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**📚 今日目标**\n${task.goals.map(g => `• ${g}`).join('\n')}`
            }
          },
          {
            tag: 'hr'
          },
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**📖 学习内容**\n${task.content.map(c => `• ${c}`).join('\n')}`
            }
          },
          {
            tag: 'hr'
          },
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**✅ 完成标准**\n${task.checkList.map(c => `☐ ${c}`).join('\n')}`
            }
          },
          {
            tag: 'hr'
          },
          {
            tag: 'div',
            fields: [
              {
                is_short: true,
                text: {
                  tag: 'lark_md',
                  content: `**⏰ 预计时间**\n${task.estimatedHours}小时`
                }
              },
              {
                is_short: true,
                text: {
                  tag: 'lark_md',
                  content: `**📊 进度**\n${day}/70天`
                }
              }
            ]
          },
          {
            tag: 'note',
            elements: [
              {
                tag: 'plain_text',
                content: '💡 晚上9点会检查你的完成情况'
              }
            ]
          }
        ]
      }
    }

    await this.send(message)
  }

  // 发送每日学习报告
  async sendDailyReport(day: number, report: {
    completedTasks: string[]
    score: number
    highlights: string[]
    issues: string[]
    suggestions: string[]
    skillProgress: Record<string, number>
  }) {
    if (!this.webhookUrl) return

    const scoreEmoji = report.score >= 9 ? '🎉' : report.score >= 7 ? '👍' : '💪'

    const message: FeishuMessageCard = {
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: `📊 Day ${day} 学习报告`
          },
          template: report.score >= 8 ? 'green' : report.score >= 6 ? 'blue' : 'yellow'
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**${scoreEmoji} 今日评分：${report.score}/10**`
            }
          },
          {
            tag: 'hr'
          },
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**✅ 完成任务**\n${report.completedTasks.map(t => `• ${t}`).join('\n')}`
            }
          },
          {
            tag: 'hr'
          },
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**🌟 今日亮点**\n${report.highlights.map(h => `• ${h}`).join('\n')}`
            }
          },
          ...(report.issues.length > 0 ? [
            {
              tag: 'hr' as const
            },
            {
              tag: 'div' as const,
              text: {
                tag: 'lark_md' as const,
                content: `**⚠️ 遇到的问题**\n${report.issues.map(i => `• ${i}`).join('\n')}`
              }
            }
          ] : []),
          {
            tag: 'hr'
          },
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**💡 改进建议**\n${report.suggestions.map(s => `• ${s}`).join('\n')}`
            }
          },
          {
            tag: 'note',
            elements: [
              {
                tag: 'plain_text',
                content: `已完成 ${day}/70 天 | 继续加油！💪`
              }
            ]
          }
        ]
      }
    }

    await this.send(message)
  }

  // 发送Phase切换通知
  async sendPhaseTransition(fromPhase: string, toPhase: string, summary: {
    completedDays: number
    projects: string[]
    skillGrowth: string[]
    nextGoals: string[]
  }) {
    if (!this.webhookUrl) return

    const message: FeishuMessageCard = {
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: `🎊 恭喜完成 ${fromPhase}！`
          },
          template: 'green'
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**${fromPhase} 回顾**\n• 完成天数：${summary.completedDays}天\n• 完成项目：${summary.projects.length}个`
            }
          },
          {
            tag: 'hr'
          },
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**📈 技能提升**\n${summary.skillGrowth.map(s => `• ${s}`).join('\n')}`
            }
          },
          {
            tag: 'hr'
          },
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**🚀 ${toPhase} 预告**\n${summary.nextGoals.map(g => `• ${g}`).join('\n')}`
            }
          },
          {
            tag: 'note',
            elements: [
              {
                tag: 'plain_text',
                content: '准备好迎接新的挑战吧！🔥'
              }
            ]
          }
        ]
      }
    }

    await this.send(message)
  }

  // 发送简单文本消息
  async sendText(text: string) {
    if (!this.webhookUrl) return

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msg_type: 'text',
        content: { text }
      })
    })
  }

  // 发送卡片消息
  private async send(message: FeishuMessageCard) {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      })

      const result = await response.json()

      if (result.code !== 0) {
        console.error('❌ 飞书消息发送失败:', result)
      } else {
        console.log('✅ 飞书消息发送成功')
      }
    } catch (error) {
      console.error('❌ 飞书消息发送异常:', error)
    }
  }
}

// 使用示例
export async function testFeishuNotification() {
  const notifier = new FeishuNotifier()

  await notifier.sendText('🎉 AI学习导师已成功接入飞书！')

  // 测试每日任务推送
  await notifier.sendDailyTask(1, 'Phase 1 - Week 1', {
    title: 'Next.js快速入门',
    goals: [
      '掌握Next.js基础概念',
      '创建lighthouse-ai-analyzer项目',
      '完成首页开发'
    ],
    content: [
      'Next.js 14新特性',
      'App Router vs Pages Router',
      'TypeScript配置'
    ],
    checkList: [
      '项目创建成功',
      '首页渲染正常',
      '代码已提交GitHub'
    ],
    estimatedHours: 6
  })
}
