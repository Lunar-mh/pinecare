import http from './api'

export type UserRole = 'elder' | 'family'
export type UserStatus = '\u6b63\u5e38' | '\u7981\u7528'

export interface UserItem {
  id: number
  nickname: string
  phone: string
  role: UserRole
  status: UserStatus
  age?: number
  address?: string
  registerDate: string
  lastActive: string
}

export interface UserListParams {
  page?: number
  pageSize?: number
  search?: string
  role?: UserRole
  status?: UserStatus
}

export interface UserListResult {
  list: UserItem[]
  total: number
  page: number
  pageSize: number
}

export interface CreateUserPayload {
  nickname: string
  phone: string
  role: UserRole
}

export async function getUsers(params: UserListParams = {}): Promise<UserListResult> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  if (params.search) qs.set('search', params.search)
  if (params.role) qs.set('role', params.role)
  if (params.status) qs.set('status', params.status)

  const suffix = qs.toString()
  const path = suffix ? `/api/v1/admin/users?${suffix}` : '/api/v1/admin/users'
  return await http.get<UserListResult>(path)
}

export async function updateUserStatus(userId: number, status: UserStatus): Promise<void> {
  await http.put(`/api/v1/admin/users/${userId}/status`, { status })
}

export async function createUser(payload: CreateUserPayload): Promise<UserItem> {
  return await http.post<UserItem>('/api/v1/admin/users', payload)
}

export async function getUserDetail(userId: number): Promise<UserItem> {
  return await http.get<UserItem>(`/api/v1/admin/users/${userId}`)
}
