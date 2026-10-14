import { useCallback, useState, useMemo } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'
import { Button, Badge, Empty, NoticeBar, Tabs, Tag, Skeleton } from '@nutui/nutui-react-taro'
import { PageShell } from '@/components/shell'
import { Icon } from '@/components/icons'
import { getElderlyOverview } from '@/services/modules/family'
import { getSOSEvents } from '@/services/modules/sos'
import type { ElderlyOverview, SOSEvent } from '@/services/types'
import './index.scss'

// 告警类型映射
const ALERT_TYPE_MAP = {
  health: { label: '健康异常', color: '#EF4444', icon: 'heart', bg: '#FEF2F2' },
  medication: { label: '用药提醒', color: '#F59E0B', icon: 'medication', bg: '#FFFBEB' },
  sos: { label: '紧急求助', color: '#DC2626', icon: 'sos', bg: '#FEE2E2' },
  location: { label: '位置告警', color: '#3B82F6', icon: 'location', bg: '#EFF6FF' },
} as const

// SOS 状态映射
const SOS_STATUS_MAP = {
  triggered: { label: '待处理', color: '#DC2626', bg: '#FEE2E2' },
  confirmed: { label: '处理中', color: '#F59E0B', bg: '#FFFBEB' },
  resolved: { label: '已解决', color: '#10B981', bg: '#D1FAE5' },
  cancelled: { label: '已取消', color: '#6B7280', bg: '#F3F4F6' },
} as const

// 触发类型映射
const TRIGGER_TYPE_MAP = {
  manual: '手动触发',
  fall: '跌倒检测',
  abnormal_vital: '体征异常',
} as const

export default function CarePage() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<ElderlyOverview | null>(null)
  const [sosEvents, setSosEvents] = useState<SOSEvent[]>([])
  const [activeTab, setActiveTab] = useState<'alerts' | 'history'>('alerts')

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const [overviewData, sosData] = await Promise.all([
        getElderlyOverview().catch(() => null),
        getSOSEvents({ page: 1, pageSize: 20 }).catch(() => ({ list: [] })),
      ])
      setOverview(overviewData)
      setSosEvents(sosData.list || [])
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [])

  useLoad(() => { loadData() })
  useDidShow(() => { if (overview) loadData(true) })

  // 计算待处理告警数
  const pendingAlerts = useMemo(() => {
    const unreadAlerts = (overview?.alerts || []).filter(a => !a.isRead)
    const activeSOSEvents = sosEvents.filter(e => e.status === 'triggered' || e.status === 'confirmed')
    return unreadAlerts.length + activeSOSEvents.length
  }, [overview, sosEvents])

  // 所有告警（合并）
  const allAlerts = useMemo(() => {
    const alerts = (overview?.alerts || []).map(alert => ({
      id: alert.id,
      type: alert.type,
      title: alert.title,
      message: alert.message,
      time: alert.createdAt,
      isRead: alert.isRead,
      source: 'alert' as const,
    }))

    const sosAlerts = sosEvents
      .filter(e => e.status === 'triggered' || e.status === 'confirmed')
      .map(event => ({
        id: event.id,
        type: 'sos' as const,
        title: TRIGGER_TYPE_MAP[event.type] || '紧急求助',
        message: event.location?.address || '未知位置',
        time: event.triggeredAt,
        isRead: false,
        source: 'sos' as const,
        sosEvent: event,
      }))

    return [...sosAlerts, ...alerts].sort((a, b) => 
      new Date(b.time).getTime() - new Date(a.time).getTime()
    )
  }, [overview, sosEvents])

  // 处理告警点击
  const handleAlertClick = (alert: typeof allAlerts[0]) => {
    if (alert.source === 'sos' && 'sosEvent' in alert) {
      Taro.navigateTo({ url: `/subpackages/sos/pages/detail/index?id=${alert.id}` })
    } else if (alert.type === 'health') {
      Taro.navigateTo({ url: '/subpackages/health/pages/index/index' })
    } else if (alert.type === 'medication') {
      Taro.navigateTo({ url: '/subpackages/medication/pages/list/index' })
    } else if (alert.type === 'location') {
      Taro.navigateTo({ url: '/subpackages/location/pages/index/index' })
    }
  }

  // 格式化时间
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr)
    const now = new Date()
    const diff = (now.getTime() - date.getTime()) / 1000 / 60

    if (diff < 1) return '刚刚'
    if (diff < 60) return `${Math.floor(diff)}分钟前`
    if (diff < 1440) return `${Math.floor(diff / 60)}小时前`
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  return (
    <PageShell roleTone="family" className="care-page" loading={loading}>
      {/* 顶部状态栏 */}
      <View className="care-header">
        <View className="care-header-content">
          <View className="care-header-title">
            <Text className="care-header-title-text">照护中心</Text>
            <Text className="care-header-subtitle">实时监护与紧急干预</Text>
          </View>
          <View className="care-header-badge" onClick={() => Taro.navigateTo({ url: '/pages/profile/index' })}>
            <Icon name="settings" size={28} color="#FFFFFF" />
          </View>
        </View>
        
        {/* 待处理告警数 */}
        {pendingAlerts > 0 && (
          <NoticeBar 
            className="care-notice"
            leftIcon={<Icon name="alert" size={20} color="#DC2626" />}
            scrollable 
          >
            您有 {pendingAlerts} 条待处理告警，请及时查看处理
          </NoticeBar>
        )}
      </View>

      {/* 快速干预卡片 */}
      <View className="care-quick-actions">
        <View className="care-quick-card" onClick={() => Taro.navigateTo({ url: '/subpackages/sos/pages/index/index' })}>
          <View className="care-quick-icon care-quick-icon--sos">
            <Icon name="sos" size={32} color="#DC2626" />
          </View>
          <View className="care-quick-info">
            <Text className="care-quick-title">紧急呼叫</Text>
            <Text className="care-quick-desc">主动联系长辈确认安全</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#94A3B8" />
        </View>

        <View className="care-quick-card" onClick={() => Taro.navigateTo({ url: '/subpackages/location/pages/index/index' })}>
          <View className="care-quick-icon care-quick-icon--location">
            <Icon name="location" size={32} color="#3B82F6" />
          </View>
          <View className="care-quick-info">
            <Text className="care-quick-title">实时定位</Text>
            <Text className="care-quick-desc">查看长辈当前位置</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#94A3B8" />
        </View>

        <View className="care-quick-card" onClick={() => Taro.navigateTo({ url: '/subpackages/medication/pages/list/index' })}>
          <View className="care-quick-icon care-quick-icon--medication">
            <Icon name="medication" size={32} color="#10B981" />
          </View>
          <View className="care-quick-info">
            <Text className="care-quick-title">用药管理</Text>
            <Text className="care-quick-desc">远程管理用药计划</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#94A3B8" />
        </View>
      </View>

      {/* Tab 切换 */}
      <View className="care-tabs">
        <Tabs 
          value={activeTab} 
          onChange={(val) => setActiveTab(val as 'alerts' | 'history')}
          activeType="line"
        >
          <Tabs.TabPane title={`待处理告警${pendingAlerts > 0 ? ` (${pendingAlerts})` : ''}`} value="alerts" />
          <Tabs.TabPane title="历史记录" value="history" />
        </Tabs>
      </View>

      {/* 告警列表 */}
      <View className="care-alerts">
        {loading ? (
          <View className="care-skeleton">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} rows={2} title animated className="care-skeleton-item" />
            ))}
          </View>
        ) : activeTab === 'alerts' ? (
          allAlerts.length > 0 ? (
            allAlerts.map(alert => {
              const config = ALERT_TYPE_MAP[alert.type]
              return (
                <View 
                  key={alert.id} 
                  className="care-alert-card"
                  onClick={() => handleAlertClick(alert)}
                >
                  <View 
                    className="care-alert-icon" 
                    style={{ backgroundColor: config.bg }}
                  >
                    <Icon name={config.icon} size={24} color={config.color} />
                  </View>
                  <View className="care-alert-content">
                    <View className="care-alert-header">
                      <Text className="care-alert-title">{alert.title}</Text>
                      <Tag 
                        type="primary" 
                        style={{ backgroundColor: config.bg, color: config.color, border: 'none' }}
                      >
                        {config.label}
                      </Tag>
                    </View>
                    <Text className="care-alert-message">{alert.message}</Text>
                    <Text className="care-alert-time">{formatTime(alert.time)}</Text>
                  </View>
                  {!alert.isRead && <View className="care-alert-dot" />}
                </View>
              )
            })
          ) : (
            <Empty description="暂无待处理告警" image="empty" />
          )
        ) : (
          sosEvents.length > 0 ? (
            sosEvents.map(event => {
              const statusConfig = SOS_STATUS_MAP[event.status]
              return (
                <View 
                  key={event.id} 
                  className="care-alert-card"
                  onClick={() => Taro.navigateTo({ url: `/subpackages/sos/pages/detail/index?id=${event.id}` })}
                >
                  <View 
                    className="care-alert-icon" 
                    style={{ backgroundColor: statusConfig.bg }}
                  >
                    <Icon name="sos" size={24} color={statusConfig.color} />
                  </View>
                  <View className="care-alert-content">
                    <View className="care-alert-header">
                      <Text className="care-alert-title">{TRIGGER_TYPE_MAP[event.type]}</Text>
                      <Tag 
                        type="primary" 
                        style={{ backgroundColor: statusConfig.bg, color: statusConfig.color, border: 'none' }}
                      >
                        {statusConfig.label}
                      </Tag>
                    </View>
                    <Text className="care-alert-message">{event.location?.address || '未知位置'}</Text>
                    <Text className="care-alert-time">{formatTime(event.triggeredAt)}</Text>
                  </View>
                </View>
              )
            })
          ) : (
            <Empty description="暂无历史记录" image="empty" />
          )
        )}
      </View>

      {/* 底部操作区 */}
      <View className="care-footer safe-area-bottom">
        <Button 
          type="primary" 
          block 
          className="care-footer-btn"
          onClick={() => Taro.makePhoneCall({ phoneNumber: '120' })}
        >
          <Icon name="phone" size={20} color="#FFFFFF" />
          <Text className="care-footer-btn-text">一键呼叫120</Text>
        </Button>
      </View>
    </PageShell>
  )
}