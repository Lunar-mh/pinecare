import http from './api'

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  username: string
  role: string
  refresh_token?: string
  expires_in?: number
}

export async function adminLogin(payload: LoginPayload): Promise<LoginResult> {
  return await http.post<LoginResult>('/api/v1/auth/admin/login', payload)
}

export function adminLogout(): void {
  localStorage.removeItem('admin_token')
}
