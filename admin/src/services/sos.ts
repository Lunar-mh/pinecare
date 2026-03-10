import http from './api'

export type SosEventStatus = 'triggered' | 'confirmed' | 'resolved' | 'cancelled'

export interface SosNotificationSummary {
  wechat: { pending: number; sent: number; failed: number }
  sms: { pending: number; sent: number; failed: number }
  total: { pending: number; sent: number; failed: number }
}

export interface SosEventItem {
  event_id: number
  user_id?: number
  user_name?: string
  user_phone?: string
  event_status: SosEventStatus
  trigger_type: string
  latitude: number | null
  longitude: number | null
  address: string | null
  created_at: string
  confirmed_at: string | null
  resolved_at: string | null
  cancelled_at: string | null
  notification_summary: SosNotificationSummary
}

export interface SosHistoryResult {
  list: SosEventItem[]
  pagination: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
}

export interface SosHistoryParams {
  page?: number
  pageSize?: number
  status?: SosEventStatus
}

function withQuery(path: string, qs: URLSearchParams): string {
  const query = qs.toString()
  return query ? `${path}?${query}` : path
}

export async function getSosHistory(params: SosHistoryParams = {}): Promise<SosHistoryResult> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  if (params.status) qs.set('status', params.status)

  return await http.get<SosHistoryResult>(withQuery('/api/v1/admin/sos/events', qs))
}

export async function confirmSosEvent(eventId: number): Promise<{ event_id: number; event_status: SosEventStatus }> {
  return await http.put<{ event_id: number; event_status: SosEventStatus }>(
    `/api/v1/admin/sos/events/${eventId}/status`,
    { status: 'confirmed' }
  )
}

export async function resolveSosEvent(eventId: number): Promise<{ event_id: number; event_status: SosEventStatus }> {
  return await http.put<{ event_id: number; event_status: SosEventStatus }>(
    `/api/v1/admin/sos/events/${eventId}/status`,
    { status: 'resolved' }
  )
}
