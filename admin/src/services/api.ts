const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

class ApiError extends Error {
  code: number

  constructor(code: number, message: string) {
    super(message)
    this.code = code
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
  const token = localStorage.getItem('admin_token')

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
    localStorage.removeItem('admin_token')
    window.location.href = '/#/login'
    throw new ApiError(401, json?.message || 'Unauthorized, please login again.')
  }

  if (!res.ok) {
    throw new ApiError(res.status, json?.message || `HTTP ${res.status}`)
  }

  if (!json) {
    throw new ApiError(500, 'Invalid response payload.')
  }

  if (json.code !== 0) {
    throw new ApiError(json.code, json.message || 'Request failed.')
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
