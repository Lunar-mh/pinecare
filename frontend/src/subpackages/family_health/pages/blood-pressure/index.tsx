import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { DataPanel, HeroHeader, PageShell, SectionBlock } from '@/components/shell'
import { getBloodPressureRecords, getLatestBloodPressure } from '@/services/modules/health'
import type { BloodPressureRecord } from '@/services/types'
import './index.scss'

export default function FamilyBloodPressurePage() {
  const [latest, setLatest] = useState<BloodPressureRecord | null>(null)
  const [records, setRecords] = useState<BloodPressureRecord[]>([])
  const loadData = useCallback(async () => {
    const [latestData, listRes] = await Promise.all([getLatestBloodPressure(), getBloodPressureRecords({ page: 1, pageSize: 6 })])
    setLatest(latestData)
    setRecords(listRes.list || [])
  }, [])
  useEffect(() => { loadData() }, [loadData])
  return <PageShell roleTone="family" className="health-detail-page"><HeroHeader roleTone="family" eyebrow="家属视角 · 血压" title="先看老人最近一次血压，再看短列表" subtitle="把家属最需要的概览留在首屏。" /><ScrollView className="detail-shell-scroll" scrollY><SectionBlock title="最近一次" description="优先判断是否需要跟进。">{latest ? <DataPanel tone={latest.status === 'danger' ? 'danger' : latest.status === 'warning' ? 'warning' : 'success'}><Text className="detail-title">{latest.systolic}/{latest.diastolic} mmHg</Text><Text className="detail-text">{new Date(latest.measuredAt).toLocaleString('zh-CN')}</Text></DataPanel> : <DataPanel tone="info"><Text className="detail-text">暂无最近一次记录。</Text></DataPanel>}</SectionBlock><SectionBlock title="最近记录" description="最近 6 条便于远程看护。"><View className="detail-stack">{records.map(item => <DataPanel key={item.id} tone={item.status === 'danger' ? 'danger' : item.status === 'warning' ? 'warning' : 'success'}><Text className="detail-title">{item.systolic}/{item.diastolic}</Text><Text className="detail-text">{new Date(item.measuredAt).toLocaleString('zh-CN')}</Text></DataPanel>)}</View></SectionBlock><View className="detail-bottom-space" /></ScrollView></PageShell>
}
