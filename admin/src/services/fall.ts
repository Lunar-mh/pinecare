import http from './api'

export type FallEventStatus = 'detecting' | 'confirmed' | 'cancelled' | 'false_alarm'

export interface FallEventItem {
  id: number
  userId: number
  nickname?: string
  phone?: string
  status: FallEventStatus
  sensorData: Record<string, unknown> | null
  sensitivity: 'high' | 'medium' | 'low'
  detectedAt: string
  cancelledAt: string | null
  confirmedAt: string | null
  createdAt: string
}

export interface FallHistoryResult {
  list: FallEventItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface FallHistoryParams {
  page?: number
  pageSize?: number
  status?: FallEventStatus
}

function withQuery(path: string, qs: URLSearchParams): string {
  const query = qs.toString()
  return query ? `${path}?${query}` : path
}

export async function getFallHistory(params: FallHistoryParams = {}): Promise<FallHistoryResult> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  if (params.status) qs.set('status', params.status)

  return await http.get<FallHistoryResult>(withQuery('/api/v1/admin/fall/events', qs))
}

export async function getFallSettings(): Promise<{ sensitivity: 'high' | 'medium' | 'low'; updatedAt: string | null }> {
  return await http.get<{ sensitivity: 'high' | 'medium' | 'low'; updatedAt: string | null }>(
    '/api/v1/fall-detection/settings'
  )
}

export async function updateFallSettings(
  sensitivity: 'high' | 'medium' | 'low'
): Promise<{ sensitivity: 'high' | 'medium' | 'low'; updatedAt: string | null }> {
  return await http.put<{ sensitivity: 'high' | 'medium' | 'low'; updatedAt: string | null }>(
    '/api/v1/fall-detection/settings',
    { sensitivity }
  )
}
