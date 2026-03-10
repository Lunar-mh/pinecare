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

export interface CommunityActivityItem {
  id: number
  title: string
  content: string
  start_time: string
  end_time: string
  max_participants: number | null
  registered_count: number
  created_at: string
}

export interface CommunityActivityResult {
  list: CommunityActivityItem[]
  pagination: Pagination
}

export interface CommunityActivityParams {
  page?: number
  pageSize?: number
  keyword?: string
  communityId?: number
}

export interface CreateCommunityActivityPayload {
  title: string
  content: string
  start_time: string
  end_time: string
  max_participants?: number | null
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

export async function getCommunityActivities(
  params: CommunityActivityParams = {}
): Promise<CommunityActivityResult> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) {
    qs.set('pageSize', String(params.pageSize))
    qs.set('page_size', String(params.pageSize))
  }
  if (params.keyword) qs.set('keyword', params.keyword)
  if (params.communityId) qs.set('community_id', String(params.communityId))

  return await http.get<CommunityActivityResult>(withQuery('/api/v1/community/activities', qs))
}

export async function createCommunityActivity(
  payload: CreateCommunityActivityPayload
): Promise<CommunityActivityItem> {
  return await http.post<CommunityActivityItem>('/api/v1/community/activities', payload)
}
