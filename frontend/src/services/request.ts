import Taro from '@tarojs/taro';

function getEnvVersion(): string {
  try {
    const info = Taro.getAccountInfoSync();
    return info?.miniProgram?.envVersion || 'develop';
  } catch (_error) {
    return 'develop';
  }
}

const DEFAULT_API_BASE = 'http://127.0.0.1:3001/api/v1';
const EXPLICIT_API_BASE = String(process.env.TARO_APP_API_BASE_URL || '').trim();
const BASE_URL = EXPLICIT_API_BASE || DEFAULT_API_BASE;
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

  if (mergedCode === 400 || mergedCode === 422) return '提交的信息有误，请检查后重试';
  if (mergedCode === 401) return '登录状态已失效，请重新登录';
  if (mergedCode === 403) return '当前操作暂无权限';
  if (mergedCode === 404) return '请求的内容不存在';
  if (mergedCode === 409) return '数据状态已变化，请刷新后重试';
  if (mergedCode === 429) return '操作过于频繁，请稍后再试';
  if (mergedCode === 503 || mergedCode === 504) return '服务暂时不可用，请稍后再试';
  return '请求失败，请稍后重试';
}

const getToken = (): string => {
  try {
    return Taro.getStorageSync('token') || '';
  } catch (_error) {
    return '';
  }
};

const requestInterceptor = (options: RequestOptions): RequestOptions => {
  const token = getToken();

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

const responseInterceptor = <T>(response: Taro.request.SuccessCallbackResult<ApiResponse<T>>): T => {
  const { data, statusCode } = response;

  if (statusCode < 200 || statusCode >= 300) {
    throw new ClientRequestError(getUserFacingMessage(statusCode, statusCode), {
      statusCode,
      debugMessage: `HTTP request failed: ${statusCode}`,
    });
  }

  if (data.code !== 0 && data.code !== 200) {
    if (data.code === 401) {
      Taro.removeStorageSync('token');
      Taro.removeStorageSync('userInfo');
      setTimeout(() => {
        Taro.reLaunch({ url: '/pages/login/index' });
      }, 100);
    }

    throw new ClientRequestError(getUserFacingMessage(data.code, statusCode), {
      code: data.code,
      statusCode,
      debugMessage: data.message || '',
    });
  }

  return data.data;
};

export const request = async <T = unknown>(options: RequestOptions): Promise<T> => {
  const finalOptions = requestInterceptor(options);

  try {
    const response = await Taro.request<ApiResponse<T>>({
      url: `${BASE_URL}${finalOptions.url}`,
      method: finalOptions.method || 'GET',
      data: finalOptions.data,
      header: finalOptions.header,
      timeout: finalOptions.timeout || TIMEOUT,
    });

    return responseInterceptor<T>(response);
  } catch (error: unknown) {
    const errMsg = (error as { errMsg?: string })?.errMsg || '';
    const errMessage = error instanceof Error ? error.message : '';

    if (errMsg.includes('timeout') || errMessage.includes('timeout')) {
      Taro.showToast({
        title: '请求超时，请稍后再试',
        icon: 'none',
        duration: 2000,
      });
      throw new ClientRequestError('请求超时，请稍后再试', { debugMessage: errMessage || errMsg });
    }

    if (errMsg.includes('fail')) {
      Taro.showToast({
        title: '网络异常，请检查连接后重试',
        icon: 'none',
        duration: 2000,
      });
      throw new ClientRequestError('网络异常，请检查连接后重试', {
        debugMessage: errMessage || errMsg,
      });
    }

    const normalized = error instanceof ClientRequestError
      ? error
      : new ClientRequestError('请求失败，请稍后重试', {
          debugMessage: errMessage || String(error || ''),
        });

    Taro.showToast({
      title: normalized.message,
      icon: 'none',
      duration: 2000,
    });

    throw normalized;
  }
};

export const get = <T>(url: string, params?: unknown) => request<T>({ url, method: 'GET', data: params });
export const post = <T>(url: string, data?: unknown) => request<T>({ url, method: 'POST', data });
export const put = <T>(url: string, data?: unknown) => request<T>({ url, method: 'PUT', data });
export const del = <T>(url: string, params?: unknown) => request<T>({ url, method: 'DELETE', data: params });

export default request;
