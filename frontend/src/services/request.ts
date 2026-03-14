import Taro from '@tarojs/taro';

declare const __TARO_APP_API_BASE_URL__: string | undefined;

function getEnvVersion(): string {
  try {
    const info = Taro.getAccountInfoSync();
    return info?.miniProgram?.envVersion || 'develop';
  } catch (_error) {
    return 'develop';
  }
}

const DEV_API_BASE = 'http://127.0.0.1:3999/api/v1';
const safeProcessEnv = typeof process !== 'undefined' && process.env ? process.env : {};
const EXPLICIT_API_BASE = String((typeof __TARO_APP_API_BASE_URL__ === 'string' && __TARO_APP_API_BASE_URL__) || safeProcessEnv.TARO_APP_API_BASE_URL || '').trim();
const ACCESS_TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refresh_token';

if (safeProcessEnv.NODE_ENV === 'production' && !EXPLICIT_API_BASE) {
  throw new Error('TARO_APP_API_BASE_URL is required for production builds.');
}

export const API_BASE_URL = EXPLICIT_API_BASE || DEV_API_BASE;
const TIMEOUT = 15000;

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: unknown;
  header?: Record<string, string>;
  timeout?: number;
}

interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

class ClientRequestError extends Error {
  code?: number;
  statusCode?: number;
  debugMessage?: string;

  constructor(message: string, options: { code?: number; statusCode?: number; debugMessage?: string } = {}) {
    super(message);
    this.name = 'ClientRequestError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.debugMessage = options.debugMessage;
  }
}

function getUserFacingMessage(code?: number, statusCode?: number): string {
  const mergedCode = Number(code || statusCode || 0);

  if (mergedCode === 400 || mergedCode === 422) return '请求参数有误，请检查后重试。';
  if (mergedCode === 401) return '登录状态已过期，请重新登录。';
  if (mergedCode === 403) return '当前账号无权执行该操作。';
  if (mergedCode === 404) return '请求的内容不存在。';
  if (mergedCode === 409) return '数据已变更，请刷新后重试。';
  if (mergedCode === 429) return '请求过于频繁，请稍后再试。';
  if (mergedCode === 503 || mergedCode === 504) return '服务暂不可用，请稍后再试。';
  return '请求失败，请稍后重试。';
}

function readStorage(key: string): string {
  try {
    return String(Taro.getStorageSync(key) || '').trim();
  } catch (_error) {
    return '';
  }
}

function writeStorage(key: string, value: string): void {
  try {
    if (value) {
      Taro.setStorageSync(key, value);
    } else {
      Taro.removeStorageSync(key);
    }
  } catch (_error) {
    // ignore storage failures
  }
}

export function getAccessToken(): string {
  return readStorage(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string {
  return readStorage(REFRESH_TOKEN_KEY);
}

export function setAuthTokens(accessToken: string, refreshToken = ''): void {
  writeStorage(ACCESS_TOKEN_KEY, accessToken);
  writeStorage(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearAuthSession(): void {
  writeStorage(ACCESS_TOKEN_KEY, '');
  writeStorage(REFRESH_TOKEN_KEY, '');
  try {
    Taro.removeStorageSync('userInfo');
  } catch (_error) {
    // ignore storage failures
  }
}

let isRedirectingToLogin = false;
let refreshPromise: Promise<string> | null = null;

export function redirectToLogin(): void {
  if (isRedirectingToLogin) {
    return;
  }

  isRedirectingToLogin = true;
  setTimeout(() => {
    Taro.reLaunch({ url: '/pages/login/index' });
    setTimeout(() => {
      isRedirectingToLogin = false;
    }, 1000);
  }, 100);
}

const requestInterceptor = (options: RequestOptions, accessTokenOverride?: string): RequestOptions => {
  const token = accessTokenOverride !== undefined ? accessTokenOverride : getAccessToken();

  return {
    ...options,
    header: {
      'Content-Type': 'application/json',
      'X-App-Env': getEnvVersion(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.header,
    },
  };
};

async function dispatchRequest<T>(options: RequestOptions) {
  return await Taro.request<ApiResponse<T>>({
    url: `${API_BASE_URL}${options.url}`,
    method: options.method || 'GET',
    data: options.data,
    header: options.header,
    timeout: options.timeout || TIMEOUT,
  });
}

const responseInterceptor = <T>(response: Taro.request.SuccessCallbackResult<ApiResponse<T>>): T => {
  const { data, statusCode } = response;

  if (statusCode < 200 || statusCode >= 300) {
    throw new ClientRequestError(getUserFacingMessage(statusCode, statusCode), {
      code: statusCode,
      statusCode,
      debugMessage: `HTTP request failed: ${statusCode}`,
    });
  }

  if (data.code !== 0 && data.code !== 200) {
    throw new ClientRequestError(getUserFacingMessage(data.code, statusCode), {
      code: data.code,
      statusCode,
      debugMessage: data.message || '',
    });
  }

  return data.data;
};

function toUnknownError(error: unknown): ClientRequestError {
  if (error instanceof ClientRequestError) {
    return error;
  }

  if (error instanceof Error) {
    return new ClientRequestError(error.message || '请求失败，请稍后重试。', {
      debugMessage: error.stack || error.message,
    });
  }

  return new ClientRequestError('请求失败，请稍后重试。', {
    debugMessage: String(error || ''),
  });
}

function handleTransportError(error: unknown): ClientRequestError {
  const errMsg = typeof error === 'object' && error && 'errMsg' in error ? String((error as { errMsg?: string }).errMsg || '') : '';
  const errMessage = error instanceof Error ? error.message : '';

  if (errMsg.includes('timeout') || errMessage.includes('timeout')) {
    return new ClientRequestError('请求超时，请稍后重试。', { debugMessage: errMessage || errMsg });
  }

  if (errMsg.includes('fail')) {
    return new ClientRequestError('网络异常，请检查网络后重试。', {
      debugMessage: errMessage || errMsg,
    });
  }

  return toUnknownError(error);
}

function isUnauthorizedError(error: ClientRequestError): boolean {
  const mergedCode = Number(error.code || error.statusCode || 0);
  return mergedCode === 401;
}

function isAuthPath(url: string): boolean {
  return String(url || '').startsWith('/auth/');
}

async function requestRefreshToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new ClientRequestError(getUserFacingMessage(401, 401), {
      code: 401,
      statusCode: 401,
      debugMessage: 'refresh token missing',
    });
  }

  const response = await Taro.request<ApiResponse<{ access_token?: string; refresh_token?: string }>>({
    url: `${API_BASE_URL}/auth/refresh-token`,
    method: 'POST',
    data: { refresh_token: refreshToken },
    header: {
      'Content-Type': 'application/json',
      'X-App-Env': getEnvVersion(),
    },
    timeout: TIMEOUT,
  });

  const { statusCode, data } = response;
  if (statusCode < 200 || statusCode >= 300) {
    throw new ClientRequestError(getUserFacingMessage(401, 401), {
      code: 401,
      statusCode,
      debugMessage: `refresh HTTP ${statusCode}`,
    });
  }

  if (data.code !== 0 && data.code !== 200) {
    throw new ClientRequestError(getUserFacingMessage(401, 401), {
      code: data.code || 401,
      statusCode,
      debugMessage: data.message || 'refresh failed',
    });
  }

  const accessToken = String(data.data?.access_token || '').trim();
  const nextRefreshToken = String(data.data?.refresh_token || refreshToken).trim();
  if (!accessToken || !nextRefreshToken) {
    throw new ClientRequestError(getUserFacingMessage(401, 401), {
      code: 401,
      statusCode: 401,
      debugMessage: 'refresh payload missing token',
    });
  }

  setAuthTokens(accessToken, nextRefreshToken);
  return accessToken;
}

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = requestRefreshToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function requestWithRetry<T>(options: RequestOptions, hasRetried: boolean): Promise<T> {
  const finalOptions = requestInterceptor(options);

  try {
    const response = await dispatchRequest<T>(finalOptions);
    return responseInterceptor<T>(response);
  } catch (error: unknown) {
    const normalized = handleTransportError(error);
    const canRefresh =
      !hasRetried &&
      !isAuthPath(options.url) &&
      isUnauthorizedError(normalized) &&
      Boolean(getRefreshToken());

    if (canRefresh) {
      try {
        const freshAccessToken = await refreshAccessToken();
        const retryOptions = requestInterceptor(options, freshAccessToken);
        const retryResponse = await dispatchRequest<T>(retryOptions);
        return responseInterceptor<T>(retryResponse);
      } catch (refreshError: unknown) {
        const refreshNormalized = handleTransportError(refreshError);
        clearAuthSession();
        redirectToLogin();

        Taro.showToast({
          title: getUserFacingMessage(401, 401),
          icon: 'none',
          duration: 2000,
        });

        throw refreshNormalized;
      }
    }

    if (!isAuthPath(options.url) && isUnauthorizedError(normalized)) {
      clearAuthSession();
      redirectToLogin();
    }

    Taro.showToast({
      title: normalized.message,
      icon: 'none',
      duration: 2000,
    });

    throw normalized;
  }
}

export const request = async <T = unknown>(options: RequestOptions): Promise<T> => {
  return await requestWithRetry<T>(options, false);
};

export const get = <T>(url: string, params?: unknown) => request<T>({ url, method: 'GET', data: params });
export const post = <T>(url: string, data?: unknown) => request<T>({ url, method: 'POST', data });
export const put = <T>(url: string, data?: unknown) => request<T>({ url, method: 'PUT', data });
export const del = <T>(url: string, params?: unknown) => request<T>({ url, method: 'DELETE', data: params });

export default request;

