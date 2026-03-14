import { useCallback, useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'
import { getElderlyOverview } from '@/services/modules/family'
import type { ElderlyOverview } from '@/services/types'
import { Icon, UserIcon } from '@/components/icons'
import { PageShell } from '@/components/shell'
import { homeQuickActionsByRole } from '@/design/navigation'
import { buildFamilySummaryCards } from '@/view-models/dashboard'
import './family.scss'

export default function FamilyDashboard() {
  const [overview, setOverview] = useState<ElderlyOverview | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const data = await getElderlyOverview()
      setOverview(data)
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [])

  useLoad(() => { loadData() })
  useDidShow(() => { if (overview) loadData(true) })

  const summaryCards = useMemo(() => buildFamilySummaryCards(overview), [overview])
  const quickActions = homeQuickActionsByRole.family

  return (
    <PageShell roleTone="family" className="family-dashboard" loading={loading}>
      <View className="family-header">
        <View className="family-greeting">
          <Text className="greeting-title">关注长辈最新状态</Text>
          <Text className="greeting-sub">随时掌握家人的健康与安全</Text>
        </View>
        <View className="avatar-btn" onClick={() => Taro.navigateTo({ url: '/pages/profile/index' })}>
          <UserIcon size={32} color="#fff" />
        </View>
      </View>

      <View className="status-overview">
        <View className="status-item">
          <Text className="val">{overview?.todayHealth.medicationProgress || 0}%</Text>
          <Text className="label">用药进度</Text>
        </View>
        <View className="status-divider" />
        <View className="status-item">
          <Text className="val">85分</Text>
          <Text className="label">健康评分</Text>
        </View>
        <View className="status-divider" />
        <View className="status-item">
          <Text className="val" style={{color: '#C97B55'}}>正常</Text>
          <Text className="label">活跃状态</Text>
        </View>
      </View>

      <View className="family-section">
        <Text className="section-title">实时位置</Text>
        <View className="location-card" onClick={() => Taro.navigateTo({ url: '/subpackages/location/pages/index/index' })}>
          <View className="location-info">
            <Icon name="location" size={24} color="#C97B55" />
            <Text className="address">{overview?.location?.address || '获取位置中...'}</Text>
          </View>
          <View className="location-meta">
            <Text className="meta-text">{overview?.location?.updatedAt || ''} 更新</Text>
            <View className="location-action">地图查看</View>
          </View>
        </View>
      </View>

      <View className="family-section">
        <Text className="section-title">今日体征指标</Text>
        <View className="stats-grid">
          {summaryCards.map(({ key, title, value, unit, hint }) => (
            <View key={key} className="stat-card">
              <Text className="stat-title">{title}</Text>
              <View className="stat-value">
                <Text className="val">{value}</Text>
                <Text className="unit">{unit}</Text>
              </View>
              <Text className="stat-hint">{hint}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="family-section">
        <Text className="section-title">常用管理功能</Text>
        <View className="action-grid">
          {quickActions.map(item => (
            <View key={item.key} className="action-item" onClick={() => Taro.navigateTo({ url: item.path })}>
              <View className="action-icon">
                <Icon name={item.icon} size={28} color="#C97B55" />
              </View>
              <Text className="action-label">{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </PageShell>
  )
}
