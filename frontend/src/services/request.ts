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
    throw new Error(`HTTP request failed: ${statusCode}`);
  }

  if (data.code !== 0 && data.code !== 200) {
    if (data.code === 401) {
      Taro.removeStorageSync('token');
      Taro.removeStorageSync('userInfo');
      setTimeout(() => {
        Taro.reLaunch({ url: '/pages/login/index' });
      }, 100);
    }

    throw new Error(data.message || 'Request failed.');
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
  } catch (error: any) {
    if (error.errMsg?.includes('timeout') || error.message?.includes('timeout')) {
      Taro.showToast({
        title: '请求超时，请稍后再试',
        icon: 'none',
        duration: 2000,
      });
      throw new Error('请求超时');
    }

    if (error.errMsg?.includes('fail')) {
      Taro.showToast({
        title: '网络异常，请检查连接后重试',
        icon: 'none',
        duration: 2000,
      });
      throw new Error('网络异常');
    }

    Taro.showToast({
      title: error.message || '请求失败',
      icon: 'none',
      duration: 2000,
    });

    throw error;
  }
};

export const get = <T>(url: string, params?: unknown) => request<T>({ url, method: 'GET', data: params });
export const post = <T>(url: string, data?: unknown) => request<T>({ url, method: 'POST', data });
export const put = <T>(url: string, data?: unknown) => request<T>({ url, method: 'PUT', data });
export const del = <T>(url: string, params?: unknown) => request<T>({ url, method: 'DELETE', data: params });

export default request;
