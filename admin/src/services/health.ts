import http from './api'

export interface HealthMetricItem {
  id: number
  userId: number
  metricType: string
  value: string | number
  valueHigh: number | null
  valueLow: number | null
  source: string
  deviceId: string | null
  measuredAt: string
  syncedAt: string
  createdAt: string
}

export interface HealthAlertItem {
  metricType: string
  value: string | number
  valueHigh: number | null
  valueLow: number | null
  measuredAt: string | null
  reasons: string[]
}

export interface HealthTodayResult {
  userId: number
  date: string
  metrics: Record<string, HealthMetricItem>
  alerts: HealthAlertItem[]
  recordsCount: number
}

export interface LatestBloodPressure {
  id: string
  systolic: number
  diastolic: number
  measuredAt: string
  status: 'warning' | 'normal'
}

export interface LatestHeartRate {
  id: string
  value: number
  measuredAt: string
  status: 'warning' | 'normal'
}

export interface AdminHealthOverviewItem {
  userId: number
  nickname: string
  phone: string
  age: number | null
  bloodPressure: string | null
  heartRate: number | null
  bloodSugar: number | null
  riskLevel: 'normal' | 'warning' | 'danger'
  lastUpdate: string | null
}

export interface AdminHealthOverviewResult {
  list: AdminHealthOverviewItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

function withUser(path: string, userId?: number): string {
  if (!userId) return path
  const qs = new URLSearchParams()
  qs.set('user_id', String(userId))
  return `${path}?${qs.toString()}`
}

function withQuery(path: string, qs: URLSearchParams): string {
  const query = qs.toString()
  return query ? `${path}?${query}` : path
}

export async function getHealthToday(userId?: number): Promise<HealthTodayResult> {
  return await http.get<HealthTodayResult>(withUser('/api/v1/health-archive/today', userId))
}

export async function getLatestBloodPressure(userId?: number): Promise<LatestBloodPressure | null> {
  return await http.get<LatestBloodPressure | null>(withUser('/api/v1/health-archive/blood-pressure/latest', userId))
}

export async function getLatestHeartRate(userId?: number): Promise<LatestHeartRate | null> {
  return await http.get<LatestHeartRate | null>(withUser('/api/v1/health-archive/heart-rate/latest', userId))
}

export async function getAdminHealthOverview(params: {
  page?: number
  pageSize?: number
  search?: string
} = {}): Promise<AdminHealthOverviewResult> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  if (params.search) qs.set('search', params.search)

  return await http.get<AdminHealthOverviewResult>(withQuery('/api/v1/admin/health/overview', qs))
}
