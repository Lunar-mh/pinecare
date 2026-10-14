import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { DataPanel, HeroHeader, PageShell, SectionBlock } from '@/components/shell'
import { getHeartRateRecords, getLatestHeartRate } from '@/services/modules/health'
import type { HeartRateRecord } from '@/services/types'
import './index.scss'

export default function FamilyHeartRatePage() {
  const [latest, setLatest] = useState<HeartRateRecord | null>(null)
  const [records, setRecords] = useState<HeartRateRecord[]>([])
  const loadData = useCallback(async () => {
    const [latestData, listRes] = await Promise.all([getLatestHeartRate(), getHeartRateRecords({ page: 1, pageSize: 6 })])
    setLatest(latestData)
    setRecords(listRes.list || [])
  }, [])
  useEffect(() => { loadData() }, [loadData])
  return <PageShell roleTone="family" className="health-detail-page"><HeroHeader roleTone="family" eyebrow="家属视角 · 心率" title="让家属先看到最新心率状态" subtitle="状态、时间和短列表统一收纳。" /><ScrollView className="detail-shell-scroll" scrollY><SectionBlock title="最近一次" description="优先判断是否超出正常区间。">{latest ? <DataPanel tone={latest.status === 'danger' ? 'danger' : latest.status === 'warning' ? 'warning' : 'success'}><Text className="detail-title">{latest.value} bpm</Text><Text className="detail-text">{new Date(latest.measuredAt).toLocaleString('zh-CN')}</Text></DataPanel> : <DataPanel tone="info"><Text className="detail-text">暂无最近一次记录。</Text></DataPanel>}</SectionBlock><SectionBlock title="最近记录" description="最近 6 条便于远程查看。"><View className="detail-stack">{records.map(item => <DataPanel key={item.id} tone={item.status === 'danger' ? 'danger' : item.status === 'warning' ? 'warning' : 'success'}><Text className="detail-title">{item.value} bpm</Text><Text className="detail-text">{new Date(item.measuredAt).toLocaleString('zh-CN')}</Text></DataPanel>)}</View></SectionBlock><View className="detail-bottom-space" /></ScrollView></PageShell>
}
