import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Health, Heart } from '@nutui/icons-react-taro'
import { DataPanel, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { addBloodPressureRecord, getBloodPressureRecords, getLatestBloodPressure } from '@/services/modules/health'
import type { BloodPressureRecord } from '@/services/types'
import './index.scss'

export default function BloodPressurePage() {
  const [latest, setLatest] = useState<BloodPressureRecord | null>(null)
  const [records, setRecords] = useState<BloodPressureRecord[]>([])
  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [pulse, setPulse] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [latestData, recordRes] = await Promise.all([getLatestBloodPressure(), getBloodPressureRecords({ page: 1, pageSize: 5 })])
      setLatest(latestData)
      setRecords(recordRes.list || [])
    } catch (error) {
      console.error('load blood pressure page failed', error)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async () => {
    if (!systolic || !diastolic) return
    await addBloodPressureRecord({ systolic: Number(systolic), diastolic: Number(diastolic), pulse: pulse ? Number(pulse) : undefined })
    setSystolic(''); setDiastolic(''); setPulse('')
    Taro.showToast({ title: '血压已记录', icon: 'success' })
    loadData()
  }

  return (
    <PageShell roleTone="elder" className="health-detail-page"><HeroHeader roleTone="elder" eyebrow="血压记录" title="记录一次就能看到最近变化" subtitle="当前值、快捷录入和最近几次记录在同一页里。" /><ScrollView className="detail-shell-scroll" scrollY><SectionBlock title="最近一次" description="先看当前状态，再决定要不要重新测。">{latest ? <DataPanel tone={latest.status === 'danger' ? 'danger' : latest.status === 'warning' ? 'warning' : 'primary'}><Text className="detail-title">{latest.systolic}/{latest.diastolic} mmHg</Text><Text className="detail-text">脉搏 {latest.pulse || '--'} · {new Date(latest.measuredAt).toLocaleString('zh-CN')}</Text></DataPanel> : <DataPanel tone="info"><Text className="detail-text">还没有最近一次记录。</Text></DataPanel>}</SectionBlock><SectionBlock title="快速录入" description="只保留必要字段，减少输入负担。"><DataPanel tone="primary"><View className="detail-form"><Input className="detail-input" value={systolic} placeholder="收缩压 120" onInput={e => setSystolic(e.detail.value)} /><Input className="detail-input" value={diastolic} placeholder="舒张压 80" onInput={e => setDiastolic(e.detail.value)} /><Input className="detail-input" value={pulse} placeholder="脉搏 72（选填）" onInput={e => setPulse(e.detail.value)} /></View></DataPanel></SectionBlock><SectionBlock title="最近记录" description="只看最近几次，避免列表太长。"><View className="detail-stack">{records.map(item => <DataPanel key={item.id} tone={item.status === 'danger' ? 'danger' : item.status === 'warning' ? 'warning' : 'success'}><Text className="detail-title">{item.systolic}/{item.diastolic} mmHg</Text><Text className="detail-text">{new Date(item.measuredAt).toLocaleString('zh-CN')}</Text></DataPanel>)}</View></SectionBlock><View className="detail-bottom-space" /></ScrollView><StickyPrimaryAction tone="elder" label="保存本次血压" icon={<Heart size={22} />} onClick={handleSave} /></PageShell>
  )
}

