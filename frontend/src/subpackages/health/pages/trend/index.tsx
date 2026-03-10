import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { DataPanel, HeroHeader, PageShell, SectionBlock } from '@/components/shell'
import { getBloodPressureTrend, getHeartRateTrend } from '@/services/modules/health'
import './index.scss'

export default function HealthTrendPage() {
  const [bp, setBp] = useState<{ dates: string[]; systolic: number[]; diastolic: number[] } | null>(null)
  const [hr, setHr] = useState<{ dates: string[]; values: number[] } | null>(null)

  const loadData = useCallback(async () => {
    const [bpRes, hrRes] = await Promise.all([getBloodPressureTrend(7), getHeartRateTrend(7)])
    setBp(bpRes)
    setHr(hrRes)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  return <PageShell roleTone="elder" className="health-detail-page"><HeroHeader roleTone="elder" eyebrow="趋势概览" title="趋势页先回到可读，而不是复杂图表" subtitle="先把最近 7 天的关键值按列表呈现，下一阶段再做更完整图表。" /><ScrollView className="detail-shell-scroll" scrollY><SectionBlock title="血压趋势" description="按天查看收缩压和舒张压变化。">{bp?.dates?.length ? <View className="detail-stack">{bp.dates.map((date, index) => <DataPanel key={date} tone="warning"><Text className="detail-title">{date}</Text><Text className="detail-text">收缩压 {bp.systolic[index]} · 舒张压 {bp.diastolic[index]}</Text></DataPanel>)}</View> : <DataPanel tone="info"><Text className="detail-text">暂无血压趋势。</Text></DataPanel>}</SectionBlock><SectionBlock title="心率趋势" description="按天查看心率变化。">{hr?.dates?.length ? <View className="detail-stack">{hr.dates.map((date, index) => <DataPanel key={date} tone="success"><Text className="detail-title">{date}</Text><Text className="detail-text">心率 {hr.values[index]} bpm</Text></DataPanel>)}</View> : <DataPanel tone="info"><Text className="detail-text">暂无心率趋势。</Text></DataPanel>}</SectionBlock><View className="detail-bottom-space" /></ScrollView></PageShell>
}
