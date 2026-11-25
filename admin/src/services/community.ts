import http from './api'

export interface Pagination {
  page: number
  page_size: number
  total: number
}

export interface CommunityVolunteerItem {
  id: number
  user_id: number
  community_id: number
  role: string
  created_at: string
  name: string
  phone: string
}

export interface CommunityVolunteerResult {
  list: CommunityVolunteerItem[]
  pagination: Pagination
}

export interface CommunityVolunteerParams {
  page?: number
  pageSize?: number
  keyword?: string
  communityId?: number
}

export interface CommunityStats {
  overview: {
    active_elders: number
    volunteers: number
    total_orders: number
    total_service_hours: number
  }
  order_distribution: {
    pending: number
    assigned: number
    processing: number
    completed: number
    cancelled: number
  }
}

export interface CommunityOrderItem {
  id: number
  order_no: string
  community_id: number
  service_type: string
  elder_id: number
  volunteer_id: number | null
  status: 'pending' | 'assigned' | 'processing' | 'completed' | 'cancelled'
  scheduled_at: string | null
  completed_at: string | null
  created_at: string
}

export interface CommunityOrderResult {
  list: CommunityOrderItem[]
  pagination: Pagination
}

export interface CommunityOrderParams {
  page?: number
  pageSize?: number
  status?: string
  communityId?: number
}

export interface CreateCommunityOrderPayload {
  service_type: string
  elder_id: number
  volunteer_id?: number | null
  scheduled_at?: string
  community_id?: number
}

function withQuery(path: string, params: URLSearchParams): string {
  const suffix = params.toString()
  return suffix ? `${path}?${suffix}` : path
}

export async function getCommunityVolunteers(
  params: CommunityVolunteerParams = {}
): Promise<CommunityVolunteerResult> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) {
    qs.set('pageSize', String(params.pageSize))
    qs.set('page_size', String(params.pageSize))
  }
  if (params.keyword) qs.set('keyword', params.keyword)
  if (params.communityId) qs.set('community_id', String(params.communityId))

  return await http.get<CommunityVolunteerResult>(withQuery('/api/v1/community/volunteers', qs))
}

export async function getCommunityStats(communityId?: number): Promise<CommunityStats> {
  const qs = new URLSearchParams()
  if (communityId) qs.set('community_id', String(communityId))
  return await http.get<CommunityStats>(withQuery('/api/v1/community/stats', qs))
}

export async function getCommunityOrders(
  params: CommunityOrderParams = {}
): Promise<CommunityOrderResult> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) {
    qs.set('pageSize', String(params.pageSize))
    qs.set('page_size', String(params.pageSize))
  }
  if (params.status) qs.set('status', params.status)
  if (params.communityId) qs.set('community_id', String(params.communityId))

  return await http.get<CommunityOrderResult>(withQuery('/api/v1/community/orders', qs))
}

export async function createCommunityOrder(
  payload: CreateCommunityOrderPayload
): Promise<CommunityOrderItem> {
  return await http.post<CommunityOrderItem>('/api/v1/community/orders', payload)
}
