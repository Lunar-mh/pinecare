import http from './api'

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

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    return await http.get<DashboardStats>('/api/v1/statistics/overview')
  } catch (err: unknown) {
    if (import.meta.env.DEV) {
      return devFallbackStats()
    }
    throw err
  }
}

export async function getRecentActivities(limit = 20): Promise<ActivityItem[]> {
  try {
    return await http.get<ActivityItem[]>(`/api/v1/statistics/activities?limit=${limit}`)
  } catch (err: unknown) {
    if (import.meta.env.DEV) {
      return []
    }
    throw err
  }
}
