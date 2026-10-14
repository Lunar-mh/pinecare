import { get, post } from '../request';
import type { TimeBankAccount, ServiceRequest, PaginatedResult } from '../types';

export const getTimeBankAccount = async () => {
  const response = await get<{
    userId?: string | number;
    balance?: number;
    totalEarned?: number;
    totalSpent?: number;
    creditLevel?: string;
    creditScore?: number;
  }>('/time-bank/account');

  return {
    userId: String(response?.userId || ''),
    balance: Number(response?.balance || 0),
    totalEarned: Number(response?.totalEarned || 0),
    totalSpent: Number(response?.totalSpent || 0),
    level: Number(response?.creditScore || 0),
    title: String(response?.creditLevel || 'new'),
  } as TimeBankAccount;
};

export const getServiceRequests = async (params?: {
  status?: 'open' | 'accepted' | 'completed';
  category?: string;
  page?: number;
  pageSize?: number;
}) => {
  const type = params?.status === 'completed' ? 'provided' : 'received';
  const response = await get<{
    list?: Array<{
      id?: string | number;
      providerId?: string | number;
      recipientId?: string | number;
      serviceType?: string;
      durationHours?: number;
      status?: string;
      createdAt?: string;
    }>;
    pagination?: { page?: number; pageSize?: number; total?: number };
  }>('/time-bank/service/history', {
    type,
    page: params?.page || 1,
    pageSize: params?.pageSize || 10,
  });

  const list = (response?.list || []).map((item) => ({
    id: String(item.id || ''),
    type: String(item.serviceType || '服务记录'),
    description: String(item.serviceType || '服务记录'),
    duration: Number(item.durationHours || 0),
    location: '-',
    status: (item.status === 'confirmed' ? 'completed' : item.status === 'pending' ? 'open' : 'cancelled') as ServiceRequest['status'],
    requesterId: String(item.recipientId || ''),
    providerId: item.providerId ? String(item.providerId) : undefined,
    createdAt: String(item.createdAt || new Date().toISOString()),
  }));

  const page = Number(response?.pagination?.page || params?.page || 1);
  const pageSize = Number(response?.pagination?.pageSize || params?.pageSize || 10);
  const total = Number(response?.pagination?.total || list.length);

  return {
    list,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  } as PaginatedResult<ServiceRequest>;
};

export const createServiceRequest = (data: {
  type: string;
  description: string;
  duration: number;
  location: string;
}) =>
  post<ServiceRequest>('/time-bank/service/record', {
    recipientId: 1,
    type: data.type,
    durationHours: data.duration,
  });

export const acceptServiceRequest = (id: string) =>
  post<void>('/time-bank/service/confirm', { recordId: Number(id), action: 'confirm' });

export const completeServiceRequest = (id: string) =>
  post<void>('/time-bank/service/confirm', { recordId: Number(id), action: 'confirm' });

export const getTimeBankTransactions = async (params?: { page?: number; pageSize?: number }) => {
  const response = await get<Array<{
    id?: string | number;
    exchangeType?: string;
    itemName?: string;
    coinsRequired?: number;
    status?: string;
    createdAt?: string;
  }>>('/time-bank/exchange/history');

  const list = (response || []).map((item) => ({
    id: String(item.id || ''),
    type: 'spend' as const,
    amount: Number(item.coinsRequired || 0),
    description: String(item.itemName || item.exchangeType || '兑换记录'),
    counterpart: undefined,
    createdAt: String(item.createdAt || new Date().toISOString()),
  }));

  const page = Number(params?.page || 1);
  const pageSize = Number(params?.pageSize || 10);
  const start = (page - 1) * pageSize;
  const pageList = list.slice(start, start + pageSize);

  return {
    list: pageList,
    total: list.length,
    page,
    pageSize,
    hasMore: start + pageSize < list.length,
  } as PaginatedResult<{
    id: string;
    type: 'earn' | 'spend';
    amount: number;
    description: string;
    counterpart?: string;
    createdAt: string;
  }>;
};
