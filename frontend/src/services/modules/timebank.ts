/**
 * timebank.ts - 时间银行相关API
 */

import { get, post } from '../request';
import type { TimeBankAccount, ServiceRequest, PaginatedResult } from '../types';

// 获取账户余额
export const getTimeBankAccount = () =>
  get<TimeBankAccount>('/timebank/account');

// 获取服务列表
export const getServiceRequests = (params?: {
  status?: 'open' | 'accepted' | 'completed';
  category?: string;
  page?: number;
  pageSize?: number;
}) =>
  get<PaginatedResult<ServiceRequest>>('/timebank/services', params);

// 发起服务请求
export const createServiceRequest = (data: {
  type: string;
  description: string;
  duration: number;
  location: string;
}) =>
  post<ServiceRequest>('/timebank/services', data);

// 接受服务请求
export const acceptServiceRequest = (id: string) =>
  post<void>(`/timebank/services/${id}/accept`, {});

// 完成服务
export const completeServiceRequest = (id: string) =>
  post<void>(`/timebank/services/${id}/complete`, {});

// 获取交易记录
export const getTimeBankTransactions = (params?: { page?: number; pageSize?: number }) =>
  get<PaginatedResult<{
    id: string;
    type: 'earn' | 'spend';
    amount: number;
    description: string;
    counterpart?: string;
    createdAt: string;
  }>>('/timebank/transactions', params);
