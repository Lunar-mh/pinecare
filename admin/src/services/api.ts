import {
  clearAdminSession,
  getAdminRefreshToken,
  getAdminToken,
  getCsrfToken,
  setAdminRefreshToken,
  setAdminToken,
  setCsrfToken,
} from './session'

const DEV_PRIMARY_BASE_URL = 'http://127.0.0.1:3001'
const DEV_RESTRICTED_FALLBACK_BASE_URL = 'http://127.0.0.1:3999'
const EXPLICIT_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').trim()

if (import.meta.env.PROD && !EXPLICIT_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is required for production builds.')
}

function resolveBaseUrls(): string[] {
  if (EXPLICIT_BASE_URL) {
    return [EXPLICIT_BASE_URL]
  }

  if (import.meta.env.DEV) {
    return [DEV_PRIMARY_BASE_URL, DEV_RESTRICTED_FALLBACK_BASE_URL]
  }

  return [DEV_PRIMARY_BASE_URL]
}

const BASE_URLS = resolveBaseUrls()

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

function toUserFacingMessage(code?: number, originalMsg?: string): string {
  if (originalMsg && /^[\u4e00-\u9fa5]/.test(originalMsg)) return originalMsg;
  const mergedCode = Number(code || 0)
  if (mergedCode === 400 || mergedCode === 422) return originalMsg || '参数错误或请求无效'
  if (mergedCode === 401) return '登录已过期或未授权'
  if (mergedCode === 403) return '没有操作权限'
  if (mergedCode === 404) return '请求的资源不存在'
  if (mergedCode === 409) return originalMsg || '数据冲突，例如已存在重复项'
  if (mergedCode === 429) return '请求过于频繁，请稍后再试'
  if (mergedCode === 503 || mergedCode === 504) return '服务暂时不可用或超时'
  return originalMsg || '发生未知错误'
}

function toNetworkFailureMessage(): string {
  return '网络连接失败，请检查网络或 API 服务是否运行'
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

function isAuthPath(path: string): boolean {
  return path.startsWith('/api/v1/auth/')
}

let isRedirectingToLogin = false
function redirectToLogin(): void {
  if (isRedirectingToLogin || typeof window === 'undefined') {
    return
  }

  isRedirectingToLogin = true
  clearAdminSession()
  window.location.href = '/#/login'
}

async function sendRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  tokenOverride?: string | null
): Promise<{ res: Response; json: ApiResponse<T> | null }> {
  const token = tokenOverride === undefined ? getAdminToken() : tokenOverride || ''
  const csrfToken = getCsrfToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken
  }

  const options: RequestInit = {
    method,
    headers,
  }

  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }

  let lastError: unknown = null

  for (let index = 0; index < BASE_URLS.length; index += 1) {
    const baseUrl = BASE_URLS[index]
    const isLastCandidate = index === BASE_URLS.length - 1

    try {
      const res = await fetch(`${baseUrl}${path}`, options)
      const refreshedCsrfToken = res.headers.get('x-csrf-token') || res.headers.get('X-CSRF-Token')
      if (refreshedCsrfToken) {
        setCsrfToken(refreshedCsrfToken)
      }

      const json = await parseJsonSafe<T>(res)
      return { res, json }
    } catch (err: unknown) {
      lastError = err
      if (!(err instanceof TypeError) || isLastCandidate) {
        throw err
      }
    }
  }

  throw (lastError instanceof Error ? lastError : new Error('??????'))
}

let refreshPromise: Promise<string> | null = null

async function refreshAdminAccessToken(): Promise<string> {
  const refreshToken = getAdminRefreshToken()
  if (!refreshToken) {
    throw new ApiError(401, toUserFacingMessage(401), '??????????')
  }

  const { res, json } = await sendRequest<{ access_token?: string; refresh_token?: string }>(
    'POST',
    '/api/v1/auth/refresh-token',
    { refresh_token: refreshToken },
    ''
  )

  if (!res.ok || !json || json.code !== 0) {
    throw new ApiError(401, toUserFacingMessage(401), json?.message || `Refresh failed: HTTP ${res.status}`)
  }

  const accessToken = String(json.data?.access_token || '').trim()
  const nextRefreshToken = String(json.data?.refresh_token || refreshToken).trim()

  if (!accessToken || !nextRefreshToken) {
    throw new ApiError(401, toUserFacingMessage(401), '???????????')
  }

  setAdminToken(accessToken)
  setAdminRefreshToken(nextRefreshToken)
  return accessToken
}

function ensureRefresh(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshAdminAccessToken().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function request<T = unknown>(method: string, path: string, body?: unknown, hasRetried = false): Promise<T> {
  let response: { res: Response; json: ApiResponse<T> | null }

  try {
    response = await sendRequest<T>(method, path, body)
  } catch (err: unknown) {
    const debugMessage = err instanceof Error ? err.message : String(err || '')
    throw new ApiError(503, toNetworkFailureMessage(), debugMessage)
  }

  const { res, json } = response

  const isUnauthorized = res.status === 401 || Number(json?.code || 0) === 401
  const canRetryWithRefresh = !hasRetried && !isAuthPath(path) && isUnauthorized && Boolean(getAdminRefreshToken())

  if (canRetryWithRefresh) {
    try {
      await ensureRefresh()
      return await request<T>(method, path, body, true)
    } catch (err: unknown) {
      redirectToLogin()
      const debugMessage = err instanceof Error ? err.message : String(err || '')
      throw new ApiError(401, toUserFacingMessage(401), debugMessage)
    }
  }

  if (isUnauthorized) {
    if (!isAuthPath(path)) {
      redirectToLogin()
    }
    throw new ApiError(401, toUserFacingMessage(401, json?.message), json?.message || `HTTP ${res.status}`)
  }

  if (!res.ok) {
    throw new ApiError(res.status, toUserFacingMessage(res.status, json?.message), json?.message || `HTTP ${res.status}`)
  }

  if (!json) {
    throw new ApiError(500, '响应数据解析失败', 'Invalid response payload')
  }

  if (json.code !== 0) {
    throw new ApiError(json.code, toUserFacingMessage(json.code, json.message), json.message || 'Error')
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

