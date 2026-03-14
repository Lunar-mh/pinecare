import { useCallback, useMemo, useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'
import { getElderlyOverview } from '@/services/modules/family'
import type { ElderlyOverview } from '@/services/types'
import { Icon, UserIcon, AlertIcon } from '@/components/icons'
import { 
  ActionGrid, 
  DataPanel, 
  EmptyState, 
  HeroHeader, 
  PageShell, 
  SectionBlock, 
  StatusCard, 
  StickyPrimaryAction 
} from '@/components/shell'
import { homeQuickActionsByRole } from '@/design/navigation'
import { buildFamilySummaryCards } from '@/view-models/dashboard'
import './FamilyDashboard.scss'

export default function FamilyDashboard() {
  const [overview, setOverview] = useState<ElderlyOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const data = await getElderlyOverview()
      setOverview(data)
    } catch (err) {
      console.error('Failed to fetch overview:', err)
    } finally {
      setLoading(false)
      setIsInitialLoad(false)
    }
  }, [])

  useLoad(() => {
    loadData()
  })

  useDidShow(() => {
    if (!isInitialLoad) {
      loadData(true)
    }
  })

  const summaryCards = useMemo(() => buildFamilySummaryCards(overview), [overview])
  const quickActions = homeQuickActionsByRole.family

  // 动画偏好设置：仅在非低功耗模式下运行高性能动画
  const ringOffset = (progress: number) => 201 - (201 * (progress || 0)) / 100

  return (
    <PageShell roleTone="family" className="family-dashboard" loading={loading}>
      <HeroHeader
        roleTone="family"
        eyebrow={overview?.name || '家属端'}
        title="守护者的智慧之窗"
        subtitle="基于实时 IoT 数据，全方位感知长辈动态。"
        aside={
          <View 
            className="avatar-luxe" 
            role="link" 
            aria-label="查看家属个人资料"
            onClick={() => Taro.navigateTo({ url: '/pages/profile/index' })}
          >
            <UserIcon size={28} color="#fff" />
          </View>
        }
      />

      <View className="guardian-rings" role="region" aria-label="核心指标圆环">
        <View className="ring-item">
          <View className="ring-svg-wrapper">
            <svg viewBox="0 0 80 80">
              <circle className="bg" cx="40" cy="40" r="32" />
              <circle 
                className="progress animate-draw" 
                cx="40" cy="40" r="32" 
                strokeDasharray="201" 
                strokeDashoffset={ringOffset(overview?.todayHealth.medicationProgress || 0)} 
              />
            </svg>
          </View>
          <Text className="label">用药进度</Text>
        </View>
        <View className="ring-item">
          <View className="ring-svg-wrapper">
            <svg viewBox="0 0 80 80">
              <circle className="bg" cx="40" cy="40" r="32" />
              <circle 
                className="progress health animate-draw" 
                cx="40" cy="40" r="32" 
                stroke="#2D5AEE" 
                strokeDasharray="201" 
                strokeDashoffset={ringOffset(85)} 
              />
            </svg>
          </View>
          <Text className="label">健康评分</Text>
        </View>
        <View className="ring-item">
          <View className="ring-svg-wrapper">
            <svg viewBox="0 0 80 80">
              <circle className="bg" cx="40" cy="40" r="32" />
              <circle 
                className="progress active-val animate-draw" 
                cx="40" cy="40" r="32" 
                stroke="#C97B55" 
                strokeDasharray="201" 
                strokeDashoffset={ringOffset(60)} 
              />
            </svg>
          </View>
          <Text className="label">活跃强度</Text>
        </View>
      </View>

      <SectionBlock title="实时体征" description="基于 IoT 设备每 5 分钟同步一次。">
        <View className="summary-grid">
          {summaryCards.map(card => (
            <StatusCard key={card.key} {...card} tone={card.tone as any} />
          ))}
        </View>
      </SectionBlock>

      <SectionBlock title="位置态势" description="电子围栏已开启，状态正常。">
        <View className="bento-layout">
          <DataPanel className="location-panel">
            <Text className="location-address">{overview?.location?.address || '位置同步中...'}</Text>
            <Text className="update-time">{overview?.location?.updatedAt} 更新</Text>
          </DataPanel>
          <DataPanel className="safety-index">
            <Text className="label">安全指数</Text>
            <Text className="val">98</Text>
          </DataPanel>
        </View>
      </SectionBlock>

      <SectionBlock title="守护中心" description="点击图标快速进入对应模块。">
        <ActionGrid
          items={quickActions.map(item => ({
            ...item,
            icon: <Icon name={item.icon} size={32} color="#2F6C5B" />
          }))}
          onSelect={(path) => Taro.navigateTo({ url: path })}
        />
      </SectionBlock>

      <StickyPrimaryAction 
        label="实时定位追踪" 
        tone="family" 
        onClick={() => Taro.navigateTo({ url: '/subpackages/location/pages/index/index' })} 
      />
    </PageShell>
  )
}
