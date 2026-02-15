/**
 * medication.ts - 用药提醒相关API
 */

import { get, post, put, del } from '../request';
import type { 
  Medication, 
  MedicationRecord, 
  TodayMedication,
  PaginatedResult 
} from '../types';

// ==================== 用药计划 ====================

// 获取用药计划列表
export const getMedications = () =>
  get<Medication[]>('/medications');

// 获取单个用药计划
export const getMedication = (id: string) =>
  get<Medication>(`/medications/${id}`);

// 添加用药计划
export const addMedication = (data: Omit<Medication, 'id' | 'userId'>) =>
  post<Medication>('/medications', data);

// 更新用药计划
export const updateMedication = (id: string, data: Partial<Medication>) =>
  put<Medication>(`/medications/${id}`, data);

// 删除用药计划
export const deleteMedication = (id: string) =>
  post<void>(`/medications/${id}/delete`);

// 启用/停用用药计划
export const toggleMedication = (id: string, isActive: boolean) =>
  put<Medication>(`/medications/${id}/toggle`, { isActive });

// ==================== 用药记录 ====================

// 获取今日用药
export const getTodayMedications = () =>
  get<TodayMedication[]>('/medications/today');

// 标记用药完成
export const markMedicationTaken = (medicationId: string, time: string) =>
  post<void>('/medications/take', { medicationId, time, takenAt: new Date().toISOString() });

// 跳过用药
export const skipMedication = (medicationId: string, time: string, reason?: string) =>
  post<void>('/medications/skip', { medicationId, time, reason });

// 获取用药历史
export const getMedicationHistory = (params: {
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}) =>
  get<PaginatedResult<MedicationRecord>>('/medications/history', params);

// ==================== 用药统计 ====================

// 获取用药依从性统计
export const getMedicationAdherence = (period: 'week' | 'month' = 'week') =>
  get<{
    adherence: number;  // 0-100%
    taken: number;
    missed: number;
    skipped: number;
    total: number;
  }>('/medications/adherence', { period });

// 获取用药日历
export const getMedicationCalendar = (month: string) =>
  get<{
    date: string;
    status: 'complete' | 'partial' | 'missed' | 'none';
    count: number;
  }[]>('/medications/calendar', { month });
