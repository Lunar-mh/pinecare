/**
 * 用户管理 API
 * 后端暂无管理员用户列表接口（/user 路由仅提供用户自己的数据）
 * 当后端实现 /admin/users 时，替换各方法实现
 */

import http from './api'

export interface UserItem {
  id: number
  nickname: string
  phone: string
  role: 'elder' | 'family'
  status: '正常' | '禁用'
  age?: number
  address?: string
  registerDate: string
  lastActive: string
}

export interface UserListParams {
  page?: number
  pageSize?: number
  search?: string
  role?: string
  status?: string
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
  role: 'elder' | 'family'
}

/**
 * 获取用户列表
 */
export async function getUsers(params: UserListParams = {}): Promise<UserListResult> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  if (params.search) qs.set('search', params.search)
  if (params.role) qs.set('role', params.role)
  if (params.status) qs.set('status', params.status)

  try {
    return await http.get<UserListResult>(`/api/v1/admin/users?${qs.toString()}`)
  } catch (_err: unknown) {
    // 后端管理员接口未实现，返回空列表
    return { list: [], total: 0, page: params.page || 1, pageSize: params.pageSize || 10 }
  }
}

/**
 * 更新用户状态（启用/禁用）
 */
export async function updateUserStatus(userId: number, status: '正常' | '禁用'): Promise<void> {
  await http.put(`/api/v1/admin/users/${userId}/status`, { status })
}

/**
 * 新增用户（管理员创建）
 */
export async function createUser(payload: CreateUserPayload): Promise<UserItem> {
  return await http.post<UserItem>('/api/v1/admin/users', payload)
}

/**
 * 获取用户详情
 */
export async function getUserDetail(userId: number): Promise<UserItem> {
  return await http.get<UserItem>(`/api/v1/admin/users/${userId}`)
}
