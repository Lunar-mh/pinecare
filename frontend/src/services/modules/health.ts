/**
 * health.ts - 健康档案相关API
 * 注意：后端路由挂载在 /health-archive，此处路径需与之对齐
 */

import { get, post, put } from '../request';
import type {
  HealthRecord,
  BloodPressureRecord,
  HeartRateRecord,
  HealthTrend,
  PaginatedResult
} from '../types';

// ==================== 血压记录 ====================

// 获取血压记录列表
export const getBloodPressureRecords = (params: {
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}) =>
  get<PaginatedResult<BloodPressureRecord>>('/health-archive/blood-pressure', params);

// 添加血压记录
export const addBloodPressureRecord = (data: {
  systolic: number;
  diastolic: number;
  pulse?: number;
  measuredAt?: string;
  note?: string;
}) => post<BloodPressureRecord>('/health-archive/blood-pressure', data);

// 获取最新血压
export const getLatestBloodPressure = () =>
  get<BloodPressureRecord | null>('/health-archive/blood-pressure/latest');

// 获取血压趋势
export const getBloodPressureTrend = (days: number = 7) =>
  get<{ dates: string[]; systolic: number[]; diastolic: number[] }>(
    '/health-archive/blood-pressure/trend', { days }
  );

// ==================== 心率记录 ====================

// 获取心率记录列表
export const getHeartRateRecords = (params: {
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}) =>
  get<PaginatedResult<HeartRateRecord>>('/health-archive/heart-rate', params);

// 添加心率记录
export const addHeartRateRecord = (data: {
  value: number;
  measuredAt?: string;
  note?: string;
}) =>
  post<HeartRateRecord>('/health-archive/heart-rate', data);

// 获取最新心率
export const getLatestHeartRate = () =>
  get<HeartRateRecord | null>('/health-archive/heart-rate/latest');

// 获取心率趋势
export const getHeartRateTrend = (days: number = 7) =>
  get<{ dates: string[]; values: number[] }>('/health-archive/heart-rate/trend', { days });

// ==================== 综合健康数据 ====================

// 获取今日健康概览
export const getTodayHealthOverview = () =>
  get<{
    bloodPressure?: BloodPressureRecord;
    heartRate?: HeartRateRecord;
    steps?: number;
    sleep?: { hours: number; quality: string };
  }>('/health-archive/today-overview');

// 获取健康统计
export const getHealthStatistics = (period: 'week' | 'month' | 'year' = 'week') =>
  get<{
    bloodPressure: { avgSystolic: number; avgDiastolic: number; abnormalCount: number };
    heartRate: { avg: number; max: number; min: number };
  }>('/health-archive/statistics', { period });

// ==================== 健康预警 ====================

// 获取健康异常提醒
export const getHealthAlerts = () =>
  get<{
    id: string;
    type: 'blood_pressure' | 'heart_rate' | 'blood_sugar';
    level: 'warning' | 'danger';
    message: string;
    suggestion: string;
    createdAt: string;
  }[]>('/health-archive/alerts');

// 忽略健康提醒
export const dismissHealthAlert = (id: string) =>
  put<void>(`/health-archive/alerts/${id}/dismiss`);
