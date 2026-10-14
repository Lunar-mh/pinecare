import http from './api'
import type { SosHistoryResult } from './sos'

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
      { label: '活跃用户', value: '--', unit: '人', color: '#01579b', bg: '#e3f2fd', trend: '' },
      { label: '今日健康记录', value: '--', unit: '条', color: '#2e7d32', bg: '#e8f5e9', trend: '' },
      { label: '待处理工单', value: '--', unit: '单', color: '#e65100', bg: '#fff3e0', trend: '' },
      { label: '进行中SOS', value: '--', unit: '条', color: '#6a1b9a', bg: '#f3e5f5', trend: '' },
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

export async function getDashboardStats(): Promise<DashboardOverviewStats> {
  try {
    // 并行请求多个统计接口
    const [statsRes, sosRes, systemRes] = await Promise.allSettled([
      http.get<DashboardStats>('/api/v1/statistics/overview'),
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

    // 从统计接口获取活跃用户
    if (statsRes.status === 'fulfilled' && statsRes.value?.stats) {
      const activeUserStat = statsRes.value.stats.find(s => s.label.includes('活跃'))
      if (activeUserStat) {
        stats.activeElders = parseInt(activeUserStat.value) || 0
      }
      // 如果有覆盖率数据
      const coverageStat = statsRes.value.stats.find(s => s.label.includes('覆盖'))
      if (coverageStat) {
        stats.communityCoverage = parseInt(coverageStat.value) || 0
      } else {
        // 假设覆盖率基于活跃用户计算
        stats.communityCoverage = stats.activeElders > 0 ? Math.min(95, 80 + Math.floor(stats.activeElders / 10)) : 0
      }
    }

    // 从SOS接口获取待处理告警数
    if (sosRes.status === 'fulfilled' && sosRes.value) {
      stats.pendingAlerts = sosRes.value.total || 0
    }

    // 从系统统计获取负载
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
  } catch (_sosErr: unknown) {
    try {
      return await http.get<ActivityItem[]>(`/api/v1/statistics/activities?limit=${limit}`)
    } catch (err: unknown) {
      if (import.meta.env.DEV) {
        return []
      }
      throw err
    }
  }
}
