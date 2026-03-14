const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001'

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

function toUserFacingMessage(code?: number): string {
  const mergedCode = Number(code || 0)
  if (mergedCode === 400 || mergedCode === 422) return '提交的信息有误，请检查后重试'
  if (mergedCode === 401) return '登录状态已失效，请重新登录'
  if (mergedCode === 403) return '当前账号暂无该操作权限'
  if (mergedCode === 404) return '请求的数据不存在'
  if (mergedCode === 409) return '数据状态已变化，请刷新后重试'
  if (mergedCode === 429) return '操作过于频繁，请稍后再试'
  if (mergedCode === 503 || mergedCode === 504) return '服务暂时不可用，请稍后再试'
  return '请求失败，请稍后重试'
}

class ApiError extends Error {
  code: number
  debugMessage?: string

  constructor(code: number, message: string, debugMessage?: string) {
    super(message)
    this.code = code
    this.debugMessage = debugMessage
    this.name = 'ApiError'
  }
}

async function parseJsonSafe<T>(res: Response): Promise<ApiResponse<T> | null> {
  try {
    return (await res.json()) as ApiResponse<T>
  } catch (_err: unknown) {
    return null
  }
}

async function request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const token = sessionStorage.getItem('admin_token')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const options: RequestInit = {
    method,
    headers,
  }

  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }

  const res = await fetch(`${BASE_URL}${path}`, options)
  const json = await parseJsonSafe<T>(res)

  if (res.status === 401) {
    sessionStorage.removeItem('admin_token')
    window.location.href = '/#/login'
    throw new ApiError(401, toUserFacingMessage(401), json?.message)
  }

  if (!res.ok) {
    throw new ApiError(res.status, toUserFacingMessage(res.status), json?.message || `HTTP ${res.status}`)
  }

  if (!json) {
    throw new ApiError(500, '服务返回格式异常，请稍后重试', 'Invalid response payload')
  }

  if (json.code !== 0) {
    throw new ApiError(json.code, toUserFacingMessage(json.code), json.message || 'Request failed')
  }

  return json.data
}

export const http = {
  get: <T = unknown>(path: string) => request<T>('GET', path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T = unknown>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T = unknown>(path: string) => request<T>('DELETE', path),
}

export { ApiError }
export default http
