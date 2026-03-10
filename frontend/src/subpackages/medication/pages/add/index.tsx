import { useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView, Input, Switch } from '@tarojs/components'
import { Add } from '@nutui/icons-react-taro'
import { DataPanel, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { addMedication } from '@/services/modules/medication'
import type { MedicationSchedule } from '@/services/types'
import './index.scss'

export default function MedicationAddPage() {
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('1片')
  const [instructions, setInstructions] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState('')
  const [hasEndDate, setHasEndDate] = useState(false)
  const [reminderTime, setReminderTime] = useState(10)
  const [schedule, setSchedule] = useState<MedicationSchedule[]>([{ time: '08:00', dosage: '1片' }])
  const [loading, setLoading] = useState(false)

  const updateSchedule = (index: number, patch: Partial<MedicationSchedule>) => {
    setSchedule(prev => prev.map((item, current) => current === index ? { ...item, ...patch } : item))
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      Taro.showToast({ title: '请先填写药物名称', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      await addMedication({
        name,
        dosage,
        frequency: `每日 ${schedule.length} 次`,
        schedule,
        startDate,
        endDate: hasEndDate ? endDate : undefined,
        instructions: instructions || undefined,
        reminderTime,
        isActive: true,
      })
      Taro.showToast({ title: '用药计划已保存', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 800)
    } catch (error) {
      console.error('save medication plan failed', error)
      Taro.showToast({ title: '保存失败，请稍后再试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell roleTone="elder" className="medication-form-page">
      <HeroHeader roleTone="elder" eyebrow="新增用药计划" title="把一张药单拆成清楚的几步" subtitle="先填药名和剂量，再补充时间与提醒，不再被长表单压住。" />
      <ScrollView className="detail-shell-scroll" scrollY>
        <SectionBlock title="基本信息" description="先把药名、剂量和备注写清楚。">
          <DataPanel tone="primary"><View className="detail-form"><View><Text className="detail-label">药物名称</Text><Input className="detail-input" value={name} onInput={e => setName(e.detail.value)} /></View><View><Text className="detail-label">常用剂量</Text><Input className="detail-input" value={dosage} onInput={e => setDosage(e.detail.value)} /></View><View><Text className="detail-label">服药说明</Text><Input className="detail-input" value={instructions} onInput={e => setInstructions(e.detail.value)} /></View></View></DataPanel>
        </SectionBlock>
        <SectionBlock title="服药时间" description="默认一条时间，可按需要继续增加。">
          <View className="detail-stack">{schedule.map((item, index) => <DataPanel key={`${item.time}-${index}`} tone="warning"><Text className="detail-label">第 {index + 1} 次</Text><View className="detail-form"><Input className="detail-input" value={item.time} onInput={e => updateSchedule(index, { time: e.detail.value })} /><Input className="detail-input" value={item.dosage} onInput={e => updateSchedule(index, { dosage: e.detail.value })} /></View></DataPanel>)}</View>
          <View className="detail-actions"><View className="detail-button" onClick={() => setSchedule(prev => [...prev, { time: '12:00', dosage }])}><Text>增加一个时间点</Text></View></View>
        </SectionBlock>
        <SectionBlock title="提醒设置" description="只保留开始日期、结束日期和提前提醒分钟数。">
          <DataPanel tone="info"><View className="detail-form"><View><Text className="detail-label">开始日期</Text><Input className="detail-input" value={startDate} onInput={e => setStartDate(e.detail.value)} /></View><View><Text className="detail-label">启用结束日期</Text><Switch checked={hasEndDate} onChange={e => setHasEndDate(e.detail.value)} color="#2f6c5b" /></View>{hasEndDate ? <View><Text className="detail-label">结束日期</Text><Input className="detail-input" value={endDate} onInput={e => setEndDate(e.detail.value)} /></View> : null}<View><Text className="detail-label">提前提醒分钟</Text><View className="detail-chip-row">{[0,5,10,15,30].map(item => <View key={item} className={`detail-chip ${reminderTime === item ? 'is-active' : ''}`} onClick={() => setReminderTime(item)}><Text>{item === 0 ? '准点' : `${item} 分钟`}</Text></View>)}</View></View></View></DataPanel>
        </SectionBlock>
        <View className="detail-bottom-space" />
      </ScrollView>
      <StickyPrimaryAction tone="elder" label={loading ? '保存中...' : '保存用药计划'} icon={<Add size={22} />} onClick={handleSubmit} />
    </PageShell>
  )
}
