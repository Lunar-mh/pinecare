import http from './api'

export interface FamilyBindingItem {
  bindingId: number
  elderId: number
  familyId: number
  status: string
  boundAt: string
  elderProfile: {
    nickname: string | null
    realName: string | null
    avatarUrl: string | null
    gender: string | null
    age: number | null
  }
  healthArchive: {
    id: number | null
    updatedAt: string | null
  }
}

export interface AdminFamilyBindingsResult {
  list: FamilyBindingItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

function withQuery(path: string, qs: URLSearchParams): string {
  const query = qs.toString()
  return query ? `${path}?${query}` : path
}

export async function getAdminFamilyBindings(params: {
  page?: number
  pageSize?: number
  search?: string
  status?: string
} = {}): Promise<AdminFamilyBindingsResult> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  if (params.search) qs.set('search', params.search)
  if (params.status) qs.set('status', params.status)

  return await http.get<AdminFamilyBindingsResult>(withQuery('/api/v1/admin/family/bindings', qs))
}
