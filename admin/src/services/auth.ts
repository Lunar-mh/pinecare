import http from './api'
import { clearAdminSession } from './session'

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
  csrf_token?: string
}

export async function adminLogin(payload: LoginPayload): Promise<LoginResult> {
  return await http.post<LoginResult>('/api/v1/auth/admin/login', payload)
}

export function adminLogout(): void {
  clearAdminSession()
}
