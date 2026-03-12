export interface HealthRecord {
  id: string;
  userId: string;
  type: 'blood_pressure' | 'heart_rate' | 'blood_sugar' | 'weight' | 'sleep';
  value: number | Record<string, number>;
  unit: string;
  measuredAt: string;
  note?: string;
  source: 'manual' | 'device';
  deviceId?: string;
}

export interface BloodPressureRecord {
  id: string;
  systolic: number;
  diastolic: number;
  pulse?: number;
  measuredAt: string;
  status: 'normal' | 'warning' | 'danger';
}

export interface HeartRateRecord {
  id: string;
  value: number;
  measuredAt: string;
  status: 'normal' | 'warning' | 'danger';
}

export interface HealthTrend {
  date: string;
  value: number | { systolic: number; diastolic: number };
}

export interface TodayHealthOverview {
  bloodPressure?: BloodPressureRecord;
  heartRate?: HeartRateRecord;
  steps?: number;
  alerts: Array<{
    metricType: string;
    level: 'warning' | 'danger';
    message: string;
    measuredAt?: string;
  }>;
  recordsCount: number;
}
