import { useCallback, useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { getElderlyOverview } from '@/services/modules/family'
import type { ElderlyOverview } from '@/services/types'
import { Icon, UserIcon, AlertIcon } from '@/components/icons'
import { ActionGrid, DataPanel, EmptyState, HeroHeader, PageShell, SectionBlock, StatusCard, StickyPrimaryAction } from '@/components/shell'
import { homeQuickActionsByRole } from '@/design/navigation'
import { buildFamilySummaryCards } from '@/view-models/dashboard'
import './FamilyDashboard.scss'

export default function FamilyDashboard() {
  const [overview, setOverview] = useState<ElderlyOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getElderlyOverview()
      setOverview(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : '暂时无法获取长辈状态'
      setError(message)
      setOverview(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useLoad(() => {
    loadData()
  })

  const navigateByPath = (path: string) => {
    if (path.startsWith('/pages/')) {
      Taro.switchTab({ url: path })
      return
    }
    Taro.navigateTo({ url: path })
  }

  const summaryCards = useMemo(() => buildFamilySummaryCards(overview), [overview])
  const quickActions = homeQuickActionsByRole.family
  const alerts = overview?.alerts.filter(item => !item.isRead).slice(0, 3) || []

  return (
    <PageShell roleTone="family" className="family-dashboard">
      <HeroHeader
        roleTone="family"
        eyebrow={overview ? `${overview.name} · ${overview.isOnline ? '在线' : '离线'}` : '家属守护视角'}
        title="把风险、位置和陪伴放到同一个首页"
        subtitle="先看长辈状态，再处理提醒，最后进入更细的模块。"
        aside={<View className="family-dashboard__avatar"><UserIcon size={22} color="#fff" /></View>}
      />

      {error && !loading ? (
        <EmptyState title="暂时无法获取守护数据" description={error} actionLabel="重新加载" onAction={loadData} icon={<AlertIcon size={28} color="#d75a4a" />} />
      ) : null}

      {!loading && !overview && !error ? (
        <EmptyState title="还没有绑定长辈" description="绑定后就能在这里看到长辈状态、异常提醒和位置共享。" actionLabel="前往家庭空间" onAction={() => navigateByPath('/subpackages/family_space/pages/index/index')} icon={<Icon name="family" size={28} color="#c97b55" />} />
      ) : null}

      {overview ? (
        <>
          <SectionBlock title="守护总览" description="先看在线状态、提醒数量和用药完成度。">
            <View className="family-dashboard__summary-grid">
              {summaryCards.map(card => (
                <StatusCard key={card.key} title={card.title} value={card.value} unit={card.unit} hint={card.hint} tone={card.tone} />
              ))}
            </View>
          </SectionBlock>

          <SectionBlock title="位置与陪伴" description="保持位置共享，也别忽略情绪陪伴。">
            <View className="family-dashboard__double-grid">
              <DataPanel tone="info">
                <Text className="family-dashboard__panel-title">最近位置</Text>
                <Text className="family-dashboard__panel-main">{overview.location?.address || '暂未获取位置'}</Text>
                <Text className="family-dashboard__panel-sub">{overview.location ? `更新时间 ${overview.location.updatedAt}` : '建议检查定位权限和共享设置。'}</Text>
              </DataPanel>
              <DataPanel tone="primary">
                <Text className="family-dashboard__panel-title">今日用药完成度</Text>
                <Text className="family-dashboard__panel-main">{overview.todayHealth.medicationProgress}%</Text>
                <Text className="family-dashboard__panel-sub">配合提醒页可以继续查看未完成计划。</Text>
              </DataPanel>
            </View>
          </SectionBlock>

          <SectionBlock title="快速进入" description="高频守护动作集中在这里。">
            <ActionGrid
              items={quickActions.map(item => ({
                key: item.key,
                label: item.label,
                description: item.description,
                badge: item.badge,
                icon: <Icon name={item.icon} size={28} color="#c97b55" />,
              }))}
              onSelect={(key) => {
                const target = quickActions.find(item => item.key === key)
                if (target) navigateByPath(target.path)
              }}
            />
          </SectionBlock>

          <SectionBlock title="待处理提醒" description="异常与告警先看最紧急的三条。" actionLabel="查看 SOS" onAction={() => navigateByPath('/subpackages/sos/pages/index/index')}>
            <DataPanel tone={alerts.length > 0 ? 'danger' : 'success'}>
              {alerts.length > 0 ? (
                <View className="family-dashboard__alert-list">
                  {alerts.map(item => (
                    <View key={item.id} className="family-dashboard__alert-item">
                      <View>
                        <Text className="family-dashboard__alert-title">{item.title}</Text>
                        <Text className="family-dashboard__alert-desc">{item.message}</Text>
                      </View>
                      <Text className="family-dashboard__alert-tag">未处理</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="family-dashboard__panel-empty">
                  <Text className="family-dashboard__panel-title">当前没有待处理提醒</Text>
                  <Text className="family-dashboard__panel-sub">如果出现 SOS、用药异常或定位异常，这里会优先展示。</Text>
                </View>
              )}
            </DataPanel>
          </SectionBlock>

          <StickyPrimaryAction label="查看实时定位" tone="family" icon={<Icon name="location" size={20} color="#fff" />} onClick={() => navigateByPath('/subpackages/location/pages/index/index')} />
        </>
      ) : null}
    </PageShell>
  )
}
