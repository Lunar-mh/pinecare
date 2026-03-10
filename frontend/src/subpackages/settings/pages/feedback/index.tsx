import { useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView, Textarea } from '@tarojs/components'
import { Message } from '@nutui/icons-react-taro'
import { DataPanel, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { post } from '@/services/request'
import './index.scss'

export default function FeedbackPage() {
  const [content, setContent] = useState('')

  const handleSubmit = async () => {
    if (!content.trim()) {
      Taro.showToast({ title: '请先输入问题或建议', icon: 'none' })
      return
    }
    try {
      await post('/user/feedback', { content })
      setContent('')
      Taro.showToast({ title: '反馈已提交', icon: 'success' })
    } catch (error) {
      console.error('submit feedback failed', error)
      Taro.showToast({ title: '提交失败，请稍后再试', icon: 'none' })
    }
  }

  return (
    <PageShell roleTone="family" className="settings-detail-page">
      <HeroHeader roleTone="family" eyebrow="帮助反馈" title="问题反馈和帮助入口放一页" subtitle="把留言动作做轻，把复杂 FAQ 留到下一阶段结构化接入。" />
      <ScrollView className="detail-shell-scroll" scrollY>
        <SectionBlock title="反馈内容" description="告诉我们哪里不顺手、哪里需要补强。">
          <DataPanel tone="primary"><Text className="detail-label">输入建议</Text><Textarea className="detail-textarea" value={content} maxlength={500} placeholder="例如：家属首页想更快看到告警，或者某个页面信息太分散。" onInput={e => setContent(e.detail.value)} /><Text className="detail-meta">{content.length}/500</Text></DataPanel>
        </SectionBlock>
        <SectionBlock title="联系支持" description="需要人工协助时，保留一个明确出口。">
          <View className="detail-stack"><DataPanel tone="info"><Text className="detail-title">客服热线</Text><Text className="detail-text">400-000-0000</Text><View className="detail-actions"><View className="detail-button detail-button--family" onClick={() => Taro.makePhoneCall({ phoneNumber: '4000000000' })}><Text>拨打热线</Text></View></View></DataPanel></View>
        </SectionBlock>
        <View className="detail-bottom-space" />
      </ScrollView>
      <StickyPrimaryAction tone="family" label="提交反馈" icon={<Message size={22} />} onClick={handleSubmit} />
    </PageShell>
  )
}
