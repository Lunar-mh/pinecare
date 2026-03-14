import { View, Text, Image } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import React, { useCallback, useMemo, useState } from 'react'
import { getTodayHealthOverview, getTodayMedications } from '@/services'
import type { TodayHealthOverview, TodayMedication } from '@/services/types'
import { Icon, UserIcon } from '@/components/icons'
import { PageShell } from '@/components/shell'
import { homeQuickActionsByRole } from '@/design/navigation'
import { buildHealthSummaryCards, getGreetingText, maskDisplayName } from '@/view-models/dashboard'
import { useRole } from '@/hooks/useRole'
import FamilyDashboard from './FamilyDashboard'
import './elder.scss'

export default function IndexPage() {
  const { isFamily } = useRole()
  const [health, setHealth] = useState<TodayHealthOverview>({ alerts: [], recordsCount: 0 })
  const [todayMeds, setTodayMeds] = useState<TodayMedication[]>([])
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<{ phone?: string; nickname?: string } | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const info = Taro.getStorageSync('userInfo')
      if (info) setUserInfo(JSON.parse(info))
    } catch (_) { setUserInfo(null) }

    try {
      const [medsRes, healthRes] = await Promise.allSettled([
        getTodayMedications(),
        getTodayHealthOverview(),
      ])
      if (medsRes.status === 'fulfilled') setTodayMeds(medsRes.value || [])
      setHealth(healthRes.status === 'fulfilled' ? healthRes.value : { alerts: [], recordsCount: 0 })
    } finally {
      setLoading(false)
    }
  }, [])

  useLoad(() => { loadData() })

  if (isFamily) return <FamilyDashboard />

  const summaryCards = useMemo(() => buildHealthSummaryCards({
    bloodPressure: health.bloodPressure,
    heartRate: health.heartRate?.value,
    todayMeds,
  }), [health, todayMeds])

  const quickActions = homeQuickActionsByRole['elder']

  const navigateByPath = (path: string) => {
    if (path) Taro.navigateTo({ url: path })
  }

  const handleSos = () => { Taro.navigateTo({ url: '/subpackages/sos/pages/index/index' }) }
  const handleVoice = () => { Taro.navigateTo({ url: '/subpackages/voice_ai/pages/index/index' }) }
  const handleCallFamily = () => { Taro.makePhoneCall({ phoneNumber: '13800138000' }) }

  return (
    <PageShell roleTone="elder" className="elder-dashboard" loading={loading}>
      <View className="elder-header">
        <View className="greeting-box">
          <Text className="greeting-title">{getGreetingText()}，{maskDisplayName(userInfo) || '长辈'}</Text>
          <Text className="greeting-sub">今天天气不错，记得多喝水哦</Text>
        </View>
        <UserIcon size={48} color="#2D5AEE" />
      </View>

      <View className="elder-main-actions">
        <View className="main-btn voice-btn" onClick={handleVoice}>
          <Icon name="mic" size={42} color="#fff" />
          <Text className="btn-text">语音帮手</Text>
        </View>
        <View className="main-btn sos-btn" onClick={handleSos}>
          <Icon name="sos" size={42} color="#fff" />
          <Text className="btn-text">紧急求救</Text>
        </View>
      </View>

      <View className="elder-section">
        <Text className="section-title">我的健康</Text>
        <View className="health-cards">
          {summaryCards.map((card, idx) => (
            <View key={card.key} className={`health-card tone-${card.tone}`}>
              <Text className="card-title">{card.title}</Text>
              <View className="card-val-row">
                <Text className="card-val">{card.value}</Text>
                <Text className="card-unit">{card.unit}</Text>
              </View>
              <Text className="card-hint">{card.hint}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="elder-section">
        <Text className="section-title">常用功能</Text>
        <View className="function-grid">
          {quickActions.map(item => (
            <View key={item.key} className="func-item" onClick={() => navigateByPath(item.path)}>
              <View className="func-icon">
                <Icon name={item.icon} size={36} color="#2D5AEE" />
              </View>
              <Text className="func-label">{item.label}</Text>
            </View>
          ))}
          <View className="func-item" onClick={handleCallFamily}>
            <View className="func-icon family-call">
              <Icon name="phone" size={36} color="#C97B55" />
            </View>
            <Text className="func-label">呼叫家属</Text>
          </View>
        </View>
      </View>
    </PageShell>
  )
}
