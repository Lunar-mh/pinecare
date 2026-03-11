/**
 * health.ts - 健康档案相关API
 * 注意：后端路由挂载在 /health-archive，此处路径需与之对齐
 */

import { get, post, put } from '../request';
import type {
  BloodPressureRecord,
  HeartRateRecord,
  PaginatedResult,
  TodayHealthOverview
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
export const getTodayHealthOverview = async (): Promise<TodayHealthOverview> => {
  const data = await get<{
    metrics?: Record<string, any>;
    alerts?: Array<{
      metricType?: string;
      level?: 'warning' | 'danger';
      message?: string;
      measuredAt?: string;
    }>;
    recordsCount?: number;
  }>('/health-archive/today');

  const bloodPressureMetric = data?.metrics?.blood_pressure;
  const heartRateMetric = data?.metrics?.heart_rate;
  const stepsMetric = data?.metrics?.steps;
  const bloodPressureStatus: BloodPressureRecord['status'] =
    bloodPressureMetric && (Number(bloodPressureMetric.valueHigh ?? bloodPressureMetric.value_high ?? 0) > 140
      || Number(bloodPressureMetric.valueLow ?? bloodPressureMetric.value_low ?? 0) > 90)
      ? 'warning'
      : 'normal';
  const heartRateValue = heartRateMetric ? Number(heartRateMetric.value ?? 0) : undefined;
  const heartRateStatus: HeartRateRecord['status'] =
    heartRateValue != null && (heartRateValue < 60 || heartRateValue > 100)
      ? 'warning'
      : 'normal';

  const bloodPressure = bloodPressureMetric ? {
    id: String(bloodPressureMetric.id),
    systolic: Number(bloodPressureMetric.valueHigh ?? bloodPressureMetric.value_high ?? 0),
    diastolic: Number(bloodPressureMetric.valueLow ?? bloodPressureMetric.value_low ?? 0),
    pulse: bloodPressureMetric.pulse != null ? Number(bloodPressureMetric.pulse) : undefined,
    measuredAt: bloodPressureMetric.measuredAt ?? bloodPressureMetric.measured_at ?? '',
    status: bloodPressureStatus,
  } : undefined;

  const heartRate = heartRateMetric ? {
    id: String(heartRateMetric.id),
    value: heartRateValue ?? 0,
    measuredAt: heartRateMetric.measuredAt ?? heartRateMetric.measured_at ?? '',
    status: heartRateStatus,
  } : undefined;

  return {
    bloodPressure,
    heartRate,
    steps: stepsMetric ? Number(stepsMetric.value ?? 0) : 0,
    alerts: (data?.alerts || []).map(item => ({
      metricType: item.metricType || 'unknown',
      level: item.level || 'warning',
      message: item.message || '检测到健康异常',
      measuredAt: item.measuredAt,
    })),
    recordsCount: Number(data?.recordsCount || 0),
  };
};

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
