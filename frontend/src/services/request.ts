/**
 * request.ts - HTTP请求封装
 * 基于Taro.request封装，支持拦截器、超时、错误处理
 */

import Taro from '@tarojs/taro';

// API基础配置
const BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3000/api/v1'  // 开发环境
  : 'https://api.yinban.com/api/v1'; // 生产环境（待核验）

const TIMEOUT = 15000; // 15秒超时

// 请求配置接口
interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  header?: Record<string, string>;
  timeout?: number;
}

// 响应数据接口
interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

// 获取Token
const getToken = (): string => {
  try {
    return Taro.getStorageSync('token') || '';
  } catch (e) {
    return '';
  }
};

// 请求拦截
const requestInterceptor = (options: RequestOptions): RequestOptions => {
  const token = getToken();
  
  return {
    ...options,
    header: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.header
    }
  };
};

// 响应拦截
const responseInterceptor = <T>(response: Taro.request.SuccessCallbackResult<ApiResponse<T>>): T => {
  const { data, statusCode } = response;
  
  // HTTP错误处理
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`HTTP错误: ${statusCode}`);
  }
  
  // 业务错误处理
  if (data.code !== 200) {
    // Token过期
    if (data.code === 401) {
      Taro.removeStorageSync('token');
      Taro.removeStorageSync('userInfo');
      
      // 跳转登录页（延迟执行避免阻塞）
      setTimeout(() => {
        Taro.reLaunch({ url: '/pages/login/index' });
      }, 100);
    }
    
    throw new Error(data.message || '请求失败');
  }
  
  return data.data;
};

// 统一请求方法
export const request = async <T = any>(options: RequestOptions): Promise<T> => {
  // 应用请求拦截
  const finalOptions = requestInterceptor(options);
  
  try {
    const response = await Taro.request<ApiResponse<T>>({
      url: `${BASE_URL}${finalOptions.url}`,
      method: finalOptions.method || 'GET',
      data: finalOptions.data,
      header: finalOptions.header,
      timeout: finalOptions.timeout || TIMEOUT
    });
    
    // 应用响应拦截
    return responseInterceptor<T>(response);
  } catch (error: any) {
    // 网络错误处理
    if (error.errMsg?.includes('timeout') || error.message?.includes('timeout')) {
      Taro.showToast({
        title: '请求超时，请稍后重试',
        icon: 'none',
        duration: 2000
      });
      throw new Error('请求超时');
    }
    
    if (error.errMsg?.includes('fail')) {
      Taro.showToast({
        title: '网络异常，请检查网络',
        icon: 'none',
        duration: 2000
      });
      throw new Error('网络异常');
    }
    
    // 显示错误提示
    Taro.showToast({
      title: error.message || '请求失败',
      icon: 'none',
      duration: 2000
    });
    
    throw error;
  }
};

// 快捷方法
export const get = <T>(url: string, params?: any) => 
  request<T>({ url, method: 'GET', data: params });

export const post = <T>(url: string, data?: any) => 
  request<T>({ url, method: 'POST', data });

export const put = <T>(url: string, data?: any) => 
  request<T>({ url, method: 'PUT', data });

export const del = <T>(url: string, params?: any) => 
  request<T>({ url, method: 'DELETE', data: params });

export default request;
