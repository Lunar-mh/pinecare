import { useCallback, useEffect, useMemo, useState } from 'react'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { Check, Health, Heart, Plus, Refresh, Warning } from '@nutui/icons-react-taro'
import {
  ActionGrid,
  DataPanel,
  EmptyState,
  HeroHeader,
  PageShell,
  SectionBlock,
  StatusCard,
  StickyPrimaryAction,
} from '@/components/shell'
import { dismissHealthAlert, getHealthAlerts, getTodayHealthOverview } from '@/services/modules/health'
import type { BloodPressureRecord, HeartRateRecord } from '@/services/types'
import './index.scss'

type HealthAlert = {
  id: string
  level: 'warning' | 'danger'
  message: string
  suggestion: string
  createdAt: string
}

export default function HealthIndex() {
  const [bloodPressure, setBloodPressure] = useState<BloodPressureRecord | null>(null)
  const [heartRate, setHeartRate] = useState<HeartRateRecord | null>(null)
  const [steps, setSteps] = useState(0)
  const [alerts, setAlerts] = useState<HealthAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadHealthData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [overview, alertList] = await Promise.all([getTodayHealthOverview(), getHealthAlerts()])
      setBloodPressure(overview.bloodPressure || null)
      setHeartRate(overview.heartRate || null)
      setSteps(overview.steps || 0)
      setAlerts(alertList || [])
    } catch (loadError) {
      console.error('load health overview failed', loadError)
      setError('当前网络不稳定，健康摘要暂时没有刷新出来。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHealthData()
  }, [loadHealthData])

  usePullDownRefresh(() => {
    loadHealthData().finally(() => Taro.stopPullDownRefresh())
  })

  const handleDismiss = async (id: string) => {
    try {
      await dismissHealthAlert(id)
      setAlerts(prev => prev.filter(item => item.id !== id))
      Taro.showToast({ title: '提醒已处理', icon: 'success' })
    } catch (dismissError) {
      console.error('dismiss health alert failed', dismissError)
      Taro.showToast({ title: '处理失败，请稍后再试', icon: 'none' })
    }
  }

  const summary = useMemo(() => {
    const completed = [bloodPressure, heartRate].filter(Boolean).length
    const bpHint = bloodPressure
      ? `最近一次 ${new Date(bloodPressure.measuredAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
      : '今天还没有记录血压'
    const hrHint = heartRate
      ? `最近一次 ${new Date(heartRate.measuredAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
      : '今天还没有记录心率'
    return { completed, bpHint, hrHint }
  }, [bloodPressure, heartRate])

  const actionItems = [
    { key: 'bp', label: '记录血压', description: '进入血压页补充本次测量', icon: <Health size={26} /> },
    { key: 'hr', label: '记录心率', description: '查看今日心率与趋势', icon: <Heart size={26} /> },
    { key: 'trend', label: '查看趋势', description: '按周对比近期变化', icon: <Refresh size={26} /> },
    { key: 'records', label: '全部记录', description: '查看历史健康档案', icon: <Check size={26} /> },
  ]

  const handleAction = (key: string) => {
    const routeMap: Record<string, string> = {
      bp: '/subpackages/health/pages/blood-pressure/index',
      hr: '/subpackages/health/pages/heart-rate/index',
      trend: '/subpackages/health/pages/trend/index',
      records: '/subpackages/health/pages/records/index',
    }
    const url = routeMap[key]
    if (url) Taro.navigateTo({ url })
  }

  return (
    <PageShell roleTone="elder" className="health-overview-page">
      <HeroHeader
        roleTone="elder"
        eyebrow="健康档案"
        title="今天先看身体有没有异常"
        subtitle="把最关键的指标放到最上面，先确认状态，再决定是否继续记录或复查。"
        aside={
          <View className="health-overview-page__header-badge">
            <Text>{loading ? '同步中' : `${summary.completed}/2 已更新`}</Text>
          </View>
        }
      />

      <ScrollView className="health-overview-page__scroll" scrollY>
        <View className="health-overview-page__grid">
          <StatusCard
            title="血压"
            value={bloodPressure ? `${bloodPressure.systolic}/${bloodPressure.diastolic}` : '--/--'}
            unit="mmHg"
            hint={summary.bpHint}
            tone={bloodPressure?.status === 'danger' ? 'danger' : bloodPressure?.status === 'warning' ? 'warning' : 'primary'}
            icon={<Health size={22} />}
            onClick={() => handleAction('bp')}
          />
          <StatusCard
            title="心率"
            value={heartRate ? `${heartRate.value}` : '--'}
            unit="bpm"
            hint={summary.hrHint}
            tone={heartRate?.status === 'danger' ? 'danger' : heartRate?.status === 'warning' ? 'warning' : 'success'}
            icon={<Heart size={22} />}
            onClick={() => handleAction('hr')}
          />
          <StatusCard
            title="步数"
            value={steps > 0 ? `${steps}` : '--'}
            unit="步"
            hint={steps > 3999 ? '今天活动量不错，继续保持。' : '可以安排一次轻量活动或散步。'}
            tone={steps > 3999 ? 'success' : 'info'}
            icon={<Refresh size={22} />}
          />
        </View>

        <SectionBlock title="异常提醒" description="优先处理会影响今天状态的项目。">
          {loading ? (
            <DataPanel tone="info">
              <Text className="health-overview-page__panel-text">正在整理今天的健康提醒...</Text>
            </DataPanel>
          ) : error ? (
            <EmptyState title="提醒加载失败" description={error} actionLabel="重新加载" onAction={loadHealthData} icon={<Warning size={28} />} />
          ) : alerts.length === 0 ? (
            <EmptyState title="今天没有新的异常提醒" description="当前指标看起来比较平稳，可以继续按计划记录。" icon={<Check size={28} />} />
          ) : (
            <View className="health-overview-page__stack">
              {alerts.map(item => (
                <DataPanel key={item.id} tone={item.level === 'danger' ? 'danger' : 'warning'}>
                  <View className="health-overview-page__alert-row">
                    <View>
                      <Text className="health-overview-page__alert-title">{item.message}</Text>
                      <Text className="health-overview-page__alert-desc">{item.suggestion}</Text>
                    </View>
                    <View className="health-overview-page__dismiss" onClick={() => handleDismiss(item.id)}>
                      <Text>已知晓</Text>
                    </View>
                  </View>
                </DataPanel>
              ))}
            </View>
          )}
        </SectionBlock>

        <SectionBlock title="接下来做什么" description="保持单屏单重点，直接进入对应动作。">
          <ActionGrid items={actionItems} columns={2} onSelect={handleAction} />
        </SectionBlock>

        <View className="health-overview-page__bottom-space" />
      </ScrollView>

      <StickyPrimaryAction
        tone="elder"
        label="记录新的健康数据"
        icon={<Plus size={22} />}
        onClick={() => {
          Taro.showActionSheet({
            itemList: ['记录血压', '记录心率', '查看趋势', '查看全部记录'],
            success: res => handleAction(['bp', 'hr', 'trend', 'records'][res.tapIndex] || 'records'),
          })
        }}
      />
    </PageShell>
  )
}

