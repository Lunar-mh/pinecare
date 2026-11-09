/**
 * medication.ts - 用药提醒相关API
 * 后端路由结构：
 *   /medication/plans  → 用药计划 CRUD
 *   /medication/logs   → 服药记录列表
 *   /medication/confirm → 确认服药
 *   /medication/history → 历史记录
 *   /medication/settings → 提醒设置
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
  get<Medication[]>('/medication/plans');

// 获取单个用药计划
export const getMedication = (id: string) =>
  get<Medication>(`/medication/plans/${id}`);

// 添加用药计划
export const addMedication = (data: Omit<Medication, 'id' | 'userId'>) =>
  post<Medication>('/medication/plans', data);

// 更新用药计划
export const updateMedication = (id: string, data: Partial<Medication>) =>
  put<Medication>(`/medication/plans/${id}`, data);

// 删除用药计划
export const deleteMedication = (id: string) =>
  del<void>(`/medication/plans/${id}`);

// ==================== 用药记录 ====================

export const getTodayMedications = async (): Promise<TodayMedication[]> => {
  const list = await get<Array<{
    log_id: number;
    medication_id: string | number;
    name: string;
    dosage: string;
    time: string;
    scheduled_time?: string;
    status: 'pending' | 'taken' | 'missed' | 'skipped';
    taken_at?: string | null;
  }>>('/medication/today');

  return (list || []).map(item => ({
    logId: String(item.log_id),
    medicationId: String(item.medication_id),
    name: item.name || '未知药品',
    dosage: item.dosage || '',
    time: item.time,
    scheduledTime: item.scheduled_time,
    status: item.status,
    takenAt: item.taken_at || undefined,
  }));
};

// 获取服药日志
export const getMedicationLogs = (params?: {
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}) =>
  get<any[]>('/medication/logs', params);

// 确认服药（标记已服用）
export const markMedicationTaken = (logId: string) =>
  post<void>('/medication/confirm', {
    log_id: Number(logId),
    status: 'taken',
  });

// 跳过用药
export const skipMedication = (logId: string, reason?: string) =>
  post<void>('/medication/confirm', {
    log_id: Number(logId),
    status: 'skipped',
    reason,
  });

// 获取用药历史
export const getMedicationHistory = (params: {
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}) =>
  get<PaginatedResult<MedicationRecord>>('/medication/history', params);

// ==================== 用药设置 ====================

// 获取用药提醒设置
export const getMedicationSettings = () =>
  get<any>('/medication/settings');

// 更新用药提醒设置
export const updateMedicationSettings = (data: any) =>
  put<any>('/medication/settings', data);

export interface MedicationCalendarDay {
  date: string;
  taken: number;
  missed: number;
  skipped: number;
  pending: number;
  total: number;
  status: 'complete' | 'partial' | 'missed' | 'none';
}

export interface MedicationCalendarData {
  month: string;
  days: MedicationCalendarDay[];
  adherenceRate: number;
}

// 获取用药日历与遵从打卡率
export const getMedicationCalendar = async (month: string): Promise<MedicationCalendarData> => {
  const res = await get<any>('/medication/history/calendar', { month });
  const rawDays: any[] = Array.isArray(res?.days) ? res.days : Array.isArray(res) ? res : [];

  let totalScheduled = 0;
  let totalTaken = 0;

  const days: MedicationCalendarDay[] = rawDays.map(item => {
    const taken = Number(item.taken || 0);
    const missed = Number(item.missed || 0);
    const skipped = Number(item.skipped || 0);
    const pending = Number(item.pending || 0);
    const total = Number(item.total || (taken + missed + skipped + pending));

    totalScheduled += total;
    totalTaken += taken;

    let status: MedicationCalendarDay['status'] = 'none';
    if (total > 0) {
      if (taken === total) {
        status = 'complete';
      } else if (taken > 0 || skipped > 0) {
        status = 'partial';
      } else if (missed > 0) {
        status = 'missed';
      }
    }

    return {
      date: item.date,
      taken,
      missed,
      skipped,
      pending,
      total,
      status: item.status || status,
    };
  });

  const adherenceRate = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 100;

  return {
    month: res?.month || month,
    days,
    adherenceRate,
  };
};

// 获取用药依从性统计
export const getMedicationAdherence = (period: 'week' | 'month' = 'week') =>
  get<{
    adherence: number;
    taken: number;
    missed: number;
    skipped: number;
    total: number;
  }>('/medication/history/adherence', { period });
