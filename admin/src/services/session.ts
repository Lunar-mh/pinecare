const TOKEN_KEY = 'admin_token'
const REFRESH_TOKEN_KEY = 'admin_refresh_token'
const CSRF_KEY = 'admin_csrf_token'

let memoryToken = ''
let memoryRefreshToken = ''
let memoryCsrfToken = ''

function readStorage(key: string): string {
  try {
    return sessionStorage.getItem(key) || ''
  } catch (_error: unknown) {
    return ''
  }
}

function writeStorage(key: string, value: string): void {
  try {
    if (value) {
      sessionStorage.setItem(key, value)
    } else {
      sessionStorage.removeItem(key)
    }
  } catch (_error: unknown) {
    // ignore storage failures in non-browser runtimes
  }
}

export function getAdminToken(): string {
  if (memoryToken) return memoryToken
  memoryToken = readStorage(TOKEN_KEY)
  return memoryToken
}

export function setAdminToken(token: string): void {
  memoryToken = token
  writeStorage(TOKEN_KEY, token)
}

export function getAdminRefreshToken(): string {
  if (memoryRefreshToken) return memoryRefreshToken
  memoryRefreshToken = readStorage(REFRESH_TOKEN_KEY)
  return memoryRefreshToken
}

export function setAdminRefreshToken(token: string): void {
  memoryRefreshToken = token
  writeStorage(REFRESH_TOKEN_KEY, token)
}

export function getCsrfToken(): string {
  if (memoryCsrfToken) return memoryCsrfToken
  memoryCsrfToken = readStorage(CSRF_KEY)
  return memoryCsrfToken
}

export function setCsrfToken(token: string): void {
  memoryCsrfToken = token
  writeStorage(CSRF_KEY, token)
}

export function clearAdminSession(): void {
  memoryToken = ''
  memoryRefreshToken = ''
  memoryCsrfToken = ''
  writeStorage(TOKEN_KEY, '')
  writeStorage(REFRESH_TOKEN_KEY, '')
  writeStorage(CSRF_KEY, '')
}
