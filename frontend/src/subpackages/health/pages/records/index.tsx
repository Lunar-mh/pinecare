import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { List } from '@nutui/icons-react-taro'
import { DataPanel, HeroHeader, PageShell, SectionBlock } from '@/components/shell'
import { getBloodPressureRecords, getHeartRateRecords } from '@/services/modules/health'
import type { BloodPressureRecord, HeartRateRecord } from '@/services/types'
import './index.scss'

export default function HealthRecordsPage() {
  const [bp, setBp] = useState<BloodPressureRecord[]>([])
  const [hr, setHr] = useState<HeartRateRecord[]>([])

  const loadData = useCallback(async () => {
    const [bpRes, hrRes] = await Promise.all([getBloodPressureRecords({ page: 1, pageSize: 10 }), getHeartRateRecords({ page: 1, pageSize: 10 })])
    setBp(bpRes.list || [])
    setHr(hrRes.list || [])
  }, [])

  useEffect(() => { loadData() }, [loadData])

  return <PageShell roleTone="elder" className="health-detail-page"><HeroHeader roleTone="elder" eyebrow="健康记录" title="所有近期记录按类型整理" subtitle="不用翻分页，先看最近十条最关键的数据。" /><ScrollView className="detail-shell-scroll" scrollY><SectionBlock title="血压记录" description="最近十条血压。">{bp.length === 0 ? <DataPanel tone="info"><Text className="detail-text">暂无血压记录。</Text></DataPanel> : <View className="detail-stack">{bp.map(item => <DataPanel key={item.id} tone={item.status === 'danger' ? 'danger' : item.status === 'warning' ? 'warning' : 'success'}><Text className="detail-title">{item.systolic}/{item.diastolic} mmHg</Text><Text className="detail-text">{new Date(item.measuredAt).toLocaleString('zh-CN')}</Text></DataPanel>)}</View>}</SectionBlock><SectionBlock title="心率记录" description="最近十条心率。">{hr.length === 0 ? <DataPanel tone="info"><Text className="detail-text">暂无心率记录。</Text></DataPanel> : <View className="detail-stack">{hr.map(item => <DataPanel key={item.id} tone={item.status === 'danger' ? 'danger' : item.status === 'warning' ? 'warning' : 'success'}><Text className="detail-title">{item.value} bpm</Text><Text className="detail-text">{new Date(item.measuredAt).toLocaleString('zh-CN')}</Text></DataPanel>)}</View>}</SectionBlock><View className="detail-bottom-space" /></ScrollView></PageShell>
}
