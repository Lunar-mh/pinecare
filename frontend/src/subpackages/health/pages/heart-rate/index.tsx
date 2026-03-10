import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Heart } from '@nutui/icons-react-taro'
import { DataPanel, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { addHeartRateRecord, getHeartRateRecords, getLatestHeartRate } from '@/services/modules/health'
import type { HeartRateRecord } from '@/services/types'
import './index.scss'

export default function HeartRatePage() {
  const [latest, setLatest] = useState<HeartRateRecord | null>(null)
  const [records, setRecords] = useState<HeartRateRecord[]>([])
  const [value, setValue] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [latestData, recordRes] = await Promise.all([getLatestHeartRate(), getHeartRateRecords({ page: 1, pageSize: 5 })])
      setLatest(latestData)
      setRecords(recordRes.list || [])
    } catch (error) {
      console.error('load heart rate page failed', error)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async () => {
    if (!value) return
    await addHeartRateRecord({ value: Number(value) })
    setValue('')
    Taro.showToast({ title: '心率已记录', icon: 'success' })
    loadData()
  }

  return (
    <PageShell roleTone="elder" className="health-detail-page"><HeroHeader roleTone="elder" eyebrow="心率记录" title="心率、状态、最近记录集中查看" subtitle="让记录页更像一张即时状态卡。" /><ScrollView className="detail-shell-scroll" scrollY><SectionBlock title="最近一次" description="先看当前值是不是需要继续观察。">{latest ? <DataPanel tone={latest.status === 'danger' ? 'danger' : latest.status === 'warning' ? 'warning' : 'primary'}><Text className="detail-title">{latest.value} bpm</Text><Text className="detail-text">{new Date(latest.measuredAt).toLocaleString('zh-CN')}</Text></DataPanel> : <DataPanel tone="info"><Text className="detail-text">还没有最近一次记录。</Text></DataPanel>}</SectionBlock><SectionBlock title="快速录入" description="这里只保留一个数值字段。"><DataPanel tone="primary"><Input className="detail-input" value={value} placeholder="输入心率，例如 72" onInput={e => setValue(e.detail.value)} /></DataPanel></SectionBlock><SectionBlock title="最近记录" description="用一致的卡片样式回看。"><View className="detail-stack">{records.map(item => <DataPanel key={item.id} tone={item.status === 'danger' ? 'danger' : item.status === 'warning' ? 'warning' : 'success'}><Text className="detail-title">{item.value} bpm</Text><Text className="detail-text">{new Date(item.measuredAt).toLocaleString('zh-CN')}</Text></DataPanel>)}</View></SectionBlock><View className="detail-bottom-space" /></ScrollView><StickyPrimaryAction tone="elder" label="保存本次心率" icon={<Heart size={22} />} onClick={handleSave} /></PageShell>
  )
}
