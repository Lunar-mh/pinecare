import http from './api'
import type { SosHistoryResult } from './sos'
import type { CommunityStats } from './community'
import type { AdminHealthOverviewResult } from './health'

export interface StatItem {
  label: string
  value: string
  unit: string
  color: string
  bg: string
  trend: string
}

export interface ActivityItem {
  id: number
  type: string
  user: string
  time: string
  status: string
}

export interface DashboardStats {
  stats: StatItem[]
  recentActivities: ActivityItem[]
}

export interface DashboardOverviewStats {
  communityCoverage: number
  systemLoad: number
  activeElders: number
  pendingAlerts: number
  mapCenter: { lat: number; lng: number }
  mapZoom: number
}

export interface SystemStats {
  cpuUsage: number
  memoryUsage: number
  activeConnections: number
  uptime: number
}

function devFallbackStats(): DashboardStats {
  return {
    stats: [
      { label: '在册长辈', value: '--', unit: '人', color: '#1F6B56', bg: '#EBF5F1', trend: '' },
      { label: '健康监测记录', value: '--', unit: '条', color: '#2F6C5B', bg: '#EEF7F3', trend: '' },
      { label: '待处理工单', value: '--', unit: '单', color: '#C86D3B', bg: '#FDF3EC', trend: '' },
      { label: '进行中SOS', value: '--', unit: '条', color: '#D33833', bg: '#FCECEC', trend: '' },
    ],
    recentActivities: [],
  }
}

function devFallbackOverviewStats(): DashboardOverviewStats {
  return {
    communityCoverage: 0,
    systemLoad: 0,
    activeElders: 0,
    pendingAlerts: 0,
    mapCenter: { lat: 0, lng: 0 },
    mapZoom: 14.5,
  }
}

export async function getDashboardOverviewData(): Promise<DashboardStats> {
  try {
    const [communityRes, healthRes, sosRes, recent] = await Promise.allSettled([
      http.get<CommunityStats>('/api/v1/community/stats'),
      http.get<AdminHealthOverviewResult>('/api/v1/admin/health/overview?page=1&pageSize=1'),
      http.get<SosHistoryResult>('/api/v1/admin/sos/events?page=1&pageSize=1&status=triggered'),
      getRecentActivities(15),
    ])

    const community = communityRes.status === 'fulfilled' ? communityRes.value : null
    const activeElders = community?.overview?.active_elders ?? 0
    const pendingOrders = community?.order_distribution?.pending ?? 0
    const healthTotal = healthRes.status === 'fulfilled' ? healthRes.value?.pagination?.total ?? 0 : 0
    const activeSos = sosRes.status === 'fulfilled' ? sosRes.value?.pagination?.total ?? 0 : 0

    return {
      stats: [
        { label: '在册长辈', value: String(activeElders), unit: '人', color: '#1F6B56', bg: '#EBF5F1', trend: '' },
        { label: '健康监测档案', value: String(healthTotal), unit: '份', color: '#2F6C5B', bg: '#EEF7F3', trend: '' },
        { label: '待处理工单', value: String(pendingOrders), unit: '单', color: '#C86D3B', bg: '#FDF3EC', trend: '' },
        { label: '进行中SOS', value: String(activeSos), unit: '条', color: '#D33833', bg: '#FCECEC', trend: '' },
      ],
      recentActivities: recent.status === 'fulfilled' ? recent.value : [],
    }
  } catch (err: unknown) {
    if (import.meta.env.DEV) {
      return devFallbackStats()
    }
    throw err
  }
}

export async function getDashboardStats(): Promise<DashboardOverviewStats> {
  try {
    const [communityRes, sosRes, systemRes] = await Promise.allSettled([
      http.get<CommunityStats>('/api/v1/community/stats'),
      http.get<SosHistoryResult>('/api/v1/admin/sos/events?page=1&pageSize=1&status=triggered'),
      http.get<SystemStats>('/api/v1/admin/system/stats'),
    ])

    const stats: DashboardOverviewStats = {
      communityCoverage: 0,
      systemLoad: 0,
      activeElders: 0,
      pendingAlerts: 0,
      mapCenter: { lat: 0, lng: 0 },
      mapZoom: 14.5,
    }

    if (communityRes.status === 'fulfilled' && communityRes.value?.overview) {
      stats.activeElders = Number(communityRes.value.overview.active_elders || 0)
      stats.communityCoverage = stats.activeElders > 0 ? Math.min(98, 82 + Math.floor(stats.activeElders / 10)) : 0
    }

    if (sosRes.status === 'fulfilled' && sosRes.value) {
      const val = sosRes.value as { pagination?: { total?: number }; total?: number }
      stats.pendingAlerts = val.pagination?.total ?? val.total ?? 0
    }

    if (systemRes.status === 'fulfilled' && systemRes.value) {
      stats.systemLoad = systemRes.value.cpuUsage || 0
    }

    return stats
  } catch (err: unknown) {
    if (import.meta.env.DEV) {
      return devFallbackOverviewStats()
    }
    throw err
  }
}

export async function getSystemStats(): Promise<SystemStats> {
  try {
    return await http.get<SystemStats>('/api/v1/admin/system/stats')
  } catch (err: unknown) {
    if (import.meta.env.DEV) {
      return { cpuUsage: 0, memoryUsage: 0, activeConnections: 0, uptime: 0 }
    }
    throw err
  }
}

export async function getRecentActivities(limit = 20): Promise<ActivityItem[]> {
  try {
    const sos = await http.get<SosHistoryResult>(`/api/v1/admin/sos/events?page=1&pageSize=${limit}`)
    return (sos.list || []).map(item => ({
      id: item.event_id,
      type:
        item.trigger_type === 'fall'
          ? 'SOS 跌倒告警'
          : item.trigger_type === 'abnormal_vital'
            ? 'SOS 指标异常'
            : 'SOS 手动求助',
      user: item.user_name || item.user_phone || `用户${item.user_id || item.event_id}`,
      time: item.created_at,
      status:
        item.event_status === 'triggered'
          ? 'SOS触发中'
          : item.event_status === 'confirmed'
            ? 'SOS已确认'
            : item.event_status === 'resolved'
              ? '已完成'
              : '已取消',
    }))
  } catch (err: unknown) {
    if (import.meta.env.DEV) {
      return []
    }
    throw err
  }
}
