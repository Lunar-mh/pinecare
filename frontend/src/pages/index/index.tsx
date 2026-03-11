import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useCallback, useMemo, useState } from 'react'
import { getTodayHealthOverview, getTodayMedications } from '@/services'
import type { TodayHealthOverview, TodayMedication } from '@/services/types'
import { Icon, UserIcon, SosIcon } from '@/components/icons'
import { ActionGrid, DataPanel, HeroHeader, PageShell, SectionBlock, StatusCard, StickyPrimaryAction } from '@/components/shell'
import { homeQuickActionsByRole, serviceClustersByRole } from '@/design/navigation'
import { buildHealthSummaryCards, getDateLabel, getGreetingText, maskDisplayName } from '@/view-models/dashboard'
import { useRole } from '@/hooks/useRole'
import FamilyDashboard from './FamilyDashboard'
import './index.scss'

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
      if (info) {
        setUserInfo(JSON.parse(info) as { phone?: string; nickname?: string })
      }
    } catch (_) {
      setUserInfo(null)
    }

    try {
      const [medsRes, healthRes] = await Promise.allSettled([
        getTodayMedications(),
        getTodayHealthOverview(),
      ])

      if (medsRes.status === 'fulfilled') {
        setTodayMeds(medsRes.value || [])
      } else {
        setTodayMeds([])
      }

      setHealth(healthRes.status === 'fulfilled' ? healthRes.value : { alerts: [], recordsCount: 0 })
    } finally {
      setLoading(false)
    }
  }, [])

  useLoad(() => {
    loadData()
  })

  if (isFamily) {
    return <FamilyDashboard />
  }

  const navigateByPath = (path: string) => {
    if (path.startsWith('/pages/')) {
      Taro.switchTab({ url: path })
      return
    }
    Taro.navigateTo({ url: path })
  }

  const summaryCards = useMemo(() => buildHealthSummaryCards({
    bloodPressure: health.bloodPressure,
    heartRate: health.heartRate,
    todayMeds,
  }), [health, todayMeds])

  const quickActions = homeQuickActionsByRole.elder
  const servicePreview = serviceClustersByRole.elder.flatMap(group => group.items).slice(0, 4)
  const pendingMeds = todayMeds.filter(item => item.status === 'pending').slice(0, 3)

  return (
    <PageShell roleTone="elder" className="home-dashboard">
      <HeroHeader
        roleTone="elder"
        eyebrow={`${getGreetingText()}，${maskDisplayName(userInfo)}`}
        title="今天最重要的照护信息"
        subtitle={`${getDateLabel()} · 把常用操作和关键状态放在前面，少找一步。`}
        aside={<View className="home-dashboard__avatar"><UserIcon size={22} color="#fff" /></View>}
      />

      <SectionBlock title="今日关键状态" description="先看身体状态和今日用药进度。">
        <View className="home-dashboard__summary-grid">
          {summaryCards.map(card => (
            <StatusCard key={card.key} title={card.title} value={loading ? '--' : card.value} unit={card.unit} hint={card.hint} tone={card.tone} />
          ))}
        </View>
      </SectionBlock>

      <SectionBlock title="快捷操作" description="高频功能直接触达，尽量一屏完成。">
        <ActionGrid
          items={quickActions.map(item => ({
            key: item.key,
            label: item.label,
            description: item.description,
            badge: item.badge,
            icon: <Icon name={item.icon} size={28} color="#2f6c5b" />,
          }))}
          onSelect={(key) => {
            const target = quickActions.find(item => item.key === key)
            if (target) navigateByPath(target.path)
          }}
        />
      </SectionBlock>

      <SectionBlock title="今日用药提醒" description="未服用的提醒会优先展示。" actionLabel="查看全部" onAction={() => navigateByPath('/subpackages/medication/pages/index/index')}>
        <DataPanel tone={pendingMeds.length > 0 ? 'warning' : 'success'}>
          {pendingMeds.length > 0 ? (
            <View className="home-dashboard__med-list">
              {pendingMeds.map(item => (
                <View key={`${item.medicationId}-${item.time}`} className="home-dashboard__med-item">
                  <View>
                    <Text className="home-dashboard__med-time">{item.time}</Text>
                    <Text className="home-dashboard__med-name">{item.name} · {item.dosage}</Text>
                  </View>
                  <Text className="home-dashboard__med-status">待服用</Text>
                </View>
              ))}
            </View>
          ) : (
            <View className="home-dashboard__panel-empty">
              <Text className="home-dashboard__panel-title">今日暂无待办用药</Text>
              <Text className="home-dashboard__panel-text">已完成的计划会在用药页中保留记录。</Text>
            </View>
          )}
        </DataPanel>
      </SectionBlock>

      <SectionBlock title="延伸服务" description="陪伴、咨询和社区连接都保留在同一风格下。">
        <ActionGrid
          items={servicePreview.map(item => ({
            key: item.key,
            label: item.label,
            description: item.description,
            badge: item.badge,
            icon: <Icon name={item.icon} size={26} color="#2f6c5b" />,
          }))}
          onSelect={(key) => {
            const target = servicePreview.find(item => item.key === key)
            if (target) navigateByPath(target.path)
          }}
        />
      </SectionBlock>

      <StickyPrimaryAction label="紧急求助 SOS" tone="elder" icon={<SosIcon size={22} color="#fff" />} onClick={() => navigateByPath('/subpackages/sos/pages/index/index')} />
    </PageShell>
  )
}
