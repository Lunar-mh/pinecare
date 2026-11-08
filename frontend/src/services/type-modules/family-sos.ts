import type { BloodPressureRecord, HeartRateRecord } from './health';

export interface SOSEvent {
  id: string;
  userId?: string;
  type: 'manual' | 'fall' | 'abnormal_vital';
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  status: 'triggered' | 'confirmed' | 'resolved' | 'cancelled';
  triggeredAt: string;
  confirmedAt?: string;
  resolvedAt?: string;
  responders?: SOSResponder[];
}

export interface SOSResponder {
  id: string;
  type: 'family' | 'community' | 'emergency';
  name: string;
  phone: string;
  respondedAt?: string;
}

export interface EmergencyContactWithLocation {
  id: string;
  name: string;
  phone: string;
  relation: string;
  distance?: string;
  canLocate: boolean;
}

export interface ElderlyOverview {
  elderlyId: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  lastActiveAt: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
    updatedAt: string;
  };
  todayHealth: {
    bloodPressure?: BloodPressureRecord;
    heartRate?: HeartRateRecord;
    medicationProgress: number;
    healthScore?: number;
  };
  deviceStatus?: 'normal' | 'offline' | 'abnormal' | {
    isOnline: boolean;
    batteryLevel?: number;
    lastReportedAt?: string;
  };
  alerts: {
    id: string;
    type: 'health' | 'medication' | 'sos' | 'location';
    title: string;
    message: string;
    createdAt: string;
    isRead: boolean;
  }[];
}
