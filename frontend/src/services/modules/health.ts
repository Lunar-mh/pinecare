import { get, post, put } from '../request';
import type { BloodPressureRecord, HeartRateRecord, PaginatedResult, TodayHealthOverview } from '../types';

type HealthArchiveRecord = {
  id?: string | number;
  value?: string | number;
  valueHigh?: number;
  value_high?: number;
  valueLow?: number;
  value_low?: number;
  measuredAt?: string;
  measured_at?: string;
  pulse?: number;
};

type HealthTrendResponse = {
  list?: HealthArchiveRecord[];
};

function resolvePeriod(days = 7): '7d' | '30d' {
  return days > 7 ? '30d' : '7d';
}

function toMeasuredAt(record: HealthArchiveRecord): string {
  return String(record.measuredAt || record.measured_at || new Date().toISOString());
}

function toBloodPressureRecord(record: HealthArchiveRecord): BloodPressureRecord {
  const text = String(record.value || '');
  const matched = text.match(/(\d{2,3})\s*[\/-]\s*(\d{2,3})/);
  const systolic = Number(record.valueHigh ?? record.value_high ?? (matched ? matched[1] : 0));
  const diastolic = Number(record.valueLow ?? record.value_low ?? (matched ? matched[2] : 0));

  return {
    id: String(record.id || ''),
    systolic,
    diastolic,
    pulse: record.pulse != null ? Number(record.pulse) : undefined,
    measuredAt: toMeasuredAt(record),
    status: systolic > 180 || diastolic > 120 ? 'danger' : systolic > 140 || diastolic > 90 ? 'warning' : 'normal',
  };
}

function toHeartRateRecord(record: HealthArchiveRecord): HeartRateRecord {
  const value = Number(record.value || 0);
  return {
    id: String(record.id || ''),
    value,
    measuredAt: toMeasuredAt(record),
    status: value > 120 || value < 45 ? 'danger' : value > 100 || value < 60 ? 'warning' : 'normal',
  };
}

function paginate<T>(list: T[], page = 1, pageSize = 10): PaginatedResult<T> {
  const safePage = Math.max(1, Number(page || 1));
  const safePageSize = Math.max(1, Number(pageSize || 10));
  const start = (safePage - 1) * safePageSize;
  const pageList = list.slice(start, start + safePageSize);
  return {
    list: pageList,
    total: list.length,
    page: safePage,
    pageSize: safePageSize,
    hasMore: start + safePageSize < list.length,
  };
}

function buildTrendByDate<T extends { measuredAt: string }>(
  list: T[],
  valueGetter: (item: T) => { a: number; b?: number }
) {
  const dayMap = new Map<string, { a: number; b?: number }>();
  list.forEach((item) => {
    const day = item.measuredAt.slice(0, 10);
    dayMap.set(day, valueGetter(item));
  });
  const dates = Array.from(dayMap.keys()).sort();
  return {
    dates,
    values: dates.map((date) => dayMap.get(date)?.a || 0),
    values2: dates.map((date) => dayMap.get(date)?.b || 0),
  };
}

export const getBloodPressureRecords = async (params: {
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}) => {
  const response = await get<HealthTrendResponse>('/health-archive/trend', {
    metric_type: 'blood_pressure',
    period: '30d',
  });
  const records = (response?.list || []).map(toBloodPressureRecord).sort((a, b) => +new Date(b.measuredAt) - +new Date(a.measuredAt));
  return paginate(records, params.page, params.pageSize);
};

export const addBloodPressureRecord = async (data: {
  systolic: number;
  diastolic: number;
  pulse?: number;
  measuredAt?: string;
  note?: string;
}) => {
  const response = await post<{ record?: HealthArchiveRecord }>('/health-archive/manual', {
    metric_type: 'blood_pressure',
    value: `${data.systolic}/${data.diastolic}`,
    value_high: data.systolic,
    value_low: data.diastolic,
    pulse: data.pulse,
    measured_at: data.measuredAt,
    note: data.note,
  });
  return toBloodPressureRecord(response?.record || {});
};

export const getLatestBloodPressure = () =>
  get<BloodPressureRecord | null>('/health-archive/blood-pressure/latest');

export const getBloodPressureTrend = async (days: number = 7) => {
  const response = await get<HealthTrendResponse>('/health-archive/trend', {
    metric_type: 'blood_pressure',
    period: resolvePeriod(days),
  });
  const records = (response?.list || []).map(toBloodPressureRecord);
  const trend = buildTrendByDate(records, (item) => ({ a: item.systolic, b: item.diastolic }));
  return { dates: trend.dates, systolic: trend.values, diastolic: trend.values2 };
};

export const getHeartRateRecords = async (params: {
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}) => {
  const response = await get<HealthTrendResponse>('/health-archive/trend', {
    metric_type: 'heart_rate',
    period: '30d',
  });
  const records = (response?.list || []).map(toHeartRateRecord).sort((a, b) => +new Date(b.measuredAt) - +new Date(a.measuredAt));
  return paginate(records, params.page, params.pageSize);
};

export const addHeartRateRecord = async (data: {
  value: number;
  measuredAt?: string;
  note?: string;
}) => {
  const response = await post<{ record?: HealthArchiveRecord }>('/health-archive/manual', {
    metric_type: 'heart_rate',
    value: data.value,
    measured_at: data.measuredAt,
    note: data.note,
  });
  return toHeartRateRecord(response?.record || {});
};

export const getLatestHeartRate = () =>
  get<HeartRateRecord | null>('/health-archive/heart-rate/latest');

export const getHeartRateTrend = async (days: number = 7) => {
  const response = await get<HealthTrendResponse>('/health-archive/trend', {
    metric_type: 'heart_rate',
    period: resolvePeriod(days),
  });
  const records = (response?.list || []).map(toHeartRateRecord);
  const trend = buildTrendByDate(records, (item) => ({ a: item.value }));
  return { dates: trend.dates, values: trend.values };
};

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

export const getHealthStatistics = async (period: 'week' | 'month' | 'year' = 'week') => {
  const days = period === 'year' ? 30 : period === 'month' ? 30 : 7;
  const [bpTrend, hrTrend] = await Promise.all([
    getBloodPressureTrend(days),
    getHeartRateTrend(days),
  ]);

  const bpLength = Math.max(bpTrend.systolic.length, 1);
  const hrLength = Math.max(hrTrend.values.length, 1);
  const avgSystolic = Math.round(bpTrend.systolic.reduce((sum, item) => sum + item, 0) / bpLength);
  const avgDiastolic = Math.round(bpTrend.diastolic.reduce((sum, item) => sum + item, 0) / bpLength);
  const hrValues = hrTrend.values.filter((item) => Number.isFinite(item));

  return {
    bloodPressure: {
      avgSystolic,
      avgDiastolic,
      abnormalCount: bpTrend.systolic.filter((item, idx) => item > 140 || (bpTrend.diastolic[idx] || 0) > 90).length,
    },
    heartRate: {
      avg: hrValues.length ? Math.round(hrValues.reduce((sum, item) => sum + item, 0) / hrLength) : 0,
      max: hrValues.length ? Math.max(...hrValues) : 0,
      min: hrValues.length ? Math.min(...hrValues) : 0,
    },
  };
};

export const getHealthAlerts = async () => {
  const today = await getTodayHealthOverview();
  return (today.alerts || []).map((item, index) => ({
    id: `${item.metricType}-${item.measuredAt || index}`,
    type: item.metricType as 'blood_pressure' | 'heart_rate' | 'blood_sugar',
    level: item.level,
    message: item.message,
    suggestion: item.level === 'danger' ? '建议立即联系家属或医护人员。' : '建议稍后复测并持续观察。',
    createdAt: item.measuredAt || new Date().toISOString(),
  }));
};

export const dismissHealthAlert = (id: string) =>
  put<void>(`/health-archive/alerts/${encodeURIComponent(id)}/dismiss`);
