/**
 * types.ts - API类型定义
 */

// ==================== 用户相关 ====================

export interface UserInfo {
  id: string;
  phone: string;
  name: string;
  avatar?: string;
  birthday?: string;
  gender?: 'male' | 'female';
  emergencyContact?: EmergencyContact[];
  createdAt: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  isPrimary: boolean;
}

// ==================== 健康档案 ====================

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
  systolic: number;  // 收缩压
  diastolic: number; // 舒张压
  pulse?: number;    // 脉搏
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

// ==================== 用药提醒 ====================

export interface Medication {
  id: string;
  userId: string;
  name: string;
  dosage: string;        // 剂量，如 "1片"
  frequency: string;     // 频率，如 "每日3次"
  schedule: MedicationSchedule[];
  startDate: string;
  endDate?: string;
  instructions?: string; // 服用说明
  reminderTime: number;  // 提前提醒分钟数
  isActive: boolean;
}

export interface MedicationSchedule {
  time: string;          // 如 "08:00"
  dosage: string;
}

export interface MedicationRecord {
  id: string;
  medicationId: string;
  scheduledTime: string;
  takenAt?: string;
  status: 'pending' | 'taken' | 'missed' | 'skipped';
  note?: string;
}

export interface TodayMedication {
  medicationId: string;
  name: string;
  dosage: string;
  time: string;
  status: 'pending' | 'taken' | 'missed';
  takenAt?: string;
}

// ==================== SOS紧急求助 ====================

export interface SOSEvent {
  id: string;
  userId: string;
  type: 'manual' | 'fall' | 'abnormal_vital';
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  status: 'triggered' | 'responding' | 'resolved';
  triggeredAt: string;
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

// ==================== 语音AI ====================

export interface VoiceCommand {
  id: string;
  command: string;
  action: string;
  parameters?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  type?: 'text' | 'voice' | 'action';
  action?: {
    type: string;
    payload: any;
  };
}

// ==================== 家属端 ====================

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
    medicationProgress: number; // 0-100
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

// ==================== 时间银行 ====================

export interface TimeBankAccount {
  userId: string;
  balance: number;      // 分钟
  totalEarned: number;
  totalSpent: number;
  level: number;
  title: string;
}

export interface ServiceRequest {
  id: string;
  type: string;
  description: string;
  duration: number;
  location: string;
  status: 'open' | 'accepted' | 'completed' | 'cancelled';
  requesterId: string;
  providerId?: string;
  createdAt: string;
}

// ==================== 位置安全 ====================

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  updatedAt: string;
}

export interface SafeZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  isActive: boolean;
}

// ==================== 医疗服务 ====================

export interface Doctor {
  id: string;
  name: string;
  title: string;
  department: string;
  hospital: string;
  avatar?: string;
  rating: number;
  consultationFee: number;
  isOnline: boolean;
  tags: string[];
}

export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  department: string;
  hospital: string;
  scheduledAt: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  type: 'online' | 'offline';
}

export interface MedicalReport {
  id: string;
  title: string;
  hospital: string;
  reportDate: string;
  type: 'blood' | 'imaging' | 'ecg' | 'other';
  fileUrl: string;
}

// ==================== AI健康顾问 ====================

export interface ConsultMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sessionId: string;
  createdAt: string;
}

export interface HealthProfile {
  age?: number;
  gender?: 'male' | 'female';
  chronicDiseases?: string[];
  allergies?: string[];
  recentIndicators?: Record<string, any>;
}

// ==================== 用药交互检查 ====================

export type DrugInteractionLevel = 'X' | 'D' | 'C' | 'B' | 'A';

export interface DrugInteractionResult {
  drugA: string;
  drugB: string;
  level: DrugInteractionLevel;
  mechanism?: string;
  description?: string;
}

export interface DrugInteractionRecord {
  id: number;
  drugA: string;
  drugB: string;
  level: DrugInteractionLevel;
  riskDescription?: string;
  suggestion?: string;
  detectedAt: string;
  status: 'new' | 'acknowledged' | 'dismissed';
}

export interface DrugContraindication {
  drugName: string;
  diseaseName: string;
  severity: 'high' | 'medium' | 'low';
  description?: string;
}

export interface DrugFoodInteraction {
  foodName: string;
  interactionType: string;
  description?: string;
  suggestion?: string;
}

// ==================== AI陪伴 ====================

export interface CompanionGame {
  id: string;
  type: 'memory' | 'matching' | 'word';
  name: string;
  description: string;
  difficulty: 1 | 2 | 3;
  icon: string;
}

export interface GameRecord {
  id: number;
  gameType: string;
  score: number;
  difficulty: number;
  durationSeconds: number;
  createdAt: string;
}

export interface EmotionTrend {
  date: string;
  emotionScore: number;
  sleepQuality?: number;
  socialFrequency?: number;
}

export interface NostalgiaContent {
  id: string;
  type: 'music' | 'story' | 'photo';
  title: string;
  description?: string;
  decade: string;
  coverUrl?: string;
  url?: string;
}

// ==================== 通用分页 ====================

export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ==================== API响应 ====================

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
