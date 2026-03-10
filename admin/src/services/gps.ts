import http from './api'

export interface GpsCurrentLocation {
  userId: number
  latitude: number
  longitude: number
  accuracy: number | null
  locationType: string
  createdAt: string
}

export interface GpsTrailItem {
  id: number
  userId: number
  latitude: number
  longitude: number
  accuracy: number | null
  locationType: string
  createdAt: string
}

export interface GpsTrailResult {
  userId: number
  startDate: string
  endDate: string
  total: number
  list: GpsTrailItem[]
}

export interface AdminGpsCurrentItem {
  id: number
  userId: number
  nickname: string
  phone: string
  age: number | null
  latitude: number
  longitude: number
  accuracy: number | null
  locationType: string
  updatedAt: string | null
}

export interface AdminGpsCurrentResult {
  list: AdminGpsCurrentItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface AdminGpsTrailResult {
  userId: number
  total: number
  list: GpsTrailItem[]
}

function withQuery(path: string, qs: URLSearchParams): string {
  const query = qs.toString()
  return query ? `${path}?${query}` : path
}

export async function getGpsCurrent(): Promise<GpsCurrentLocation | null> {
  return await http.get<GpsCurrentLocation | null>('/api/v1/gps/current')
}

export async function getGpsTrail(params: {
  startDate: string
  endDate: string
  limit?: number
}): Promise<GpsTrailResult> {
  const qs = new URLSearchParams()
  qs.set('startDate', params.startDate)
  qs.set('endDate', params.endDate)
  if (params.limit) qs.set('limit', String(params.limit))

  return await http.get<GpsTrailResult>(withQuery('/api/v1/gps/trail', qs))
}

export async function getAdminGpsCurrent(params: {
  page?: number
  pageSize?: number
  search?: string
} = {}): Promise<AdminGpsCurrentResult> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  if (params.search) qs.set('search', params.search)

  return await http.get<AdminGpsCurrentResult>(withQuery('/api/v1/admin/gps/current', qs))
}

export async function getAdminGpsTrail(params: {
  userId: number
  startDate: string
  endDate: string
  limit?: number
}): Promise<AdminGpsTrailResult> {
  const qs = new URLSearchParams()
  qs.set('userId', String(params.userId))
  qs.set('startDate', params.startDate)
  qs.set('endDate', params.endDate)
  if (params.limit) qs.set('limit', String(params.limit))

  return await http.get<AdminGpsTrailResult>(withQuery('/api/v1/admin/gps/trail', qs))
}
