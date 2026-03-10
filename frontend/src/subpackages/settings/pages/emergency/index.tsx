import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView, Input } from '@tarojs/components'
import { Notice, Plus } from '@nutui/icons-react-taro'
import { DataPanel, EmptyState, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { del, get, post, put } from '@/services/request'
import './index.scss'

type Contact = { id: string; name: string; phone: string; relation: string }

export default function EmergencyContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState({ id: '', name: '', phone: '', relation: '' })

  const loadContacts = async () => {
    setLoading(true)
    try {
      const response = (await get('/user/emergency-contacts')) as { data?: Contact[] }
      setContacts(response?.data || [])
    } catch (error) {
      console.error('load emergency contacts failed', error)
      setContacts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadContacts() }, [])

  const handleSave = async () => {
    if (!draft.name || !draft.phone || !draft.relation) {
      Taro.showToast({ title: '请把姓名、电话和关系填完整', icon: 'none' })
      return
    }
    try {
      if (draft.id) await put(`/user/emergency-contacts/${draft.id}`, draft)
      else await post('/user/emergency-contacts', draft)
      setDraft({ id: '', name: '', phone: '', relation: '' })
      Taro.showToast({ title: '联系人已保存', icon: 'success' })
      loadContacts()
    } catch (error) {
      console.error('save emergency contact failed', error)
      Taro.showToast({ title: '保存失败，请稍后再试', icon: 'none' })
    }
  }

  return (
    <PageShell roleTone="family" className="settings-detail-page">
      <HeroHeader roleTone="family" eyebrow="紧急联系人" title="SOS 联系方式集中维护" subtitle="家属关系、电话号码和编辑动作放到一屏，减少跳转。" />
      <ScrollView className="detail-shell-scroll" scrollY>
        <SectionBlock title="联系人列表" description="确认紧急情况下谁会先收到通知。">
          {loading ? <DataPanel tone="info"><Text className="detail-text">正在同步联系人...</Text></DataPanel> : contacts.length === 0 ? <EmptyState title="还没有紧急联系人" description="建议至少补充 1 位主要联系人。" icon={<Notice size={28} />} /> : <View className="detail-stack">{contacts.map(item => <DataPanel key={item.id} tone="warning"><Text className="detail-title">{item.name} · {item.relation}</Text><Text className="detail-text">{item.phone}</Text><View className="detail-actions"><View className="detail-button detail-button--family" onClick={() => setDraft(item)}><Text>编辑</Text></View><View className="detail-button detail-button--danger" onClick={() => del(`/user/emergency-contacts/${item.id}`).then(loadContacts)}><Text>删除</Text></View></View></DataPanel>)}</View>}
        </SectionBlock>
        <SectionBlock title="新增或编辑" description="默认只保留姓名、电话、关系三个字段。">
          <DataPanel tone="primary"><View className="detail-form"><View><Text className="detail-label">姓名</Text><Input className="detail-input" value={draft.name} onInput={e => setDraft(prev => ({ ...prev, name: e.detail.value }))} /></View><View><Text className="detail-label">电话</Text><Input className="detail-input" value={draft.phone} onInput={e => setDraft(prev => ({ ...prev, phone: e.detail.value }))} /></View><View><Text className="detail-label">关系</Text><Input className="detail-input" value={draft.relation} onInput={e => setDraft(prev => ({ ...prev, relation: e.detail.value }))} /></View><View className="detail-actions"><View className="detail-button detail-button--family-primary" onClick={handleSave}><Text>保存联系人</Text></View></View></View></DataPanel>
        </SectionBlock>
        <View className="detail-bottom-space" />
      </ScrollView>
      <StickyPrimaryAction tone="family" label="新增联系人" icon={<Plus size={22} />} onClick={() => setDraft({ id: '', name: '', phone: '', relation: '' })} />
    </PageShell>
  )
}

