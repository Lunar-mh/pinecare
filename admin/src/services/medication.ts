import http from './api'

export interface MedicationPlanItem {
  id: number
  user_id: number
  medication_name: string
  dosage: string
  frequency: string
  remind_times: string[]
  start_date: string
  end_date: string | null
  remaining_quantity: number | null
  reminder_threshold: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MedicationLogItem {
  id: number
  user_id: number
  plan_id: number
  medication_name: string
  dosage: string
  scheduled_time: string
  actual_time: string | null
  status: 'pending' | 'taken' | 'skipped' | 'missed'
  reminder_sent: number
  second_reminder_sent: number
  family_notified: number
  created_at: string
  updated_at: string
}

export interface MedicationLogResult {
  list: MedicationLogItem[]
  filters: {
    start_date: string | null
    end_date: string | null
  }
  total: number
}

export interface MedicationSettings {
  user_id: number
  reminder_enabled: number
  family_sync_enabled: number
  sleep_start: string
  sleep_end: string
  created_at: string
  updated_at: string
}

export interface AdminMedicationLogItem {
  id: number
  userId: number
  nickname: string
  phone: string
  planId: number
  medicationName: string
  dosage: string
  scheduledTime: string | null
  actualTime: string | null
  status: 'pending' | 'taken' | 'skipped' | 'missed'
  reminderSent: number
  secondReminderSent: number
  familyNotified: number
}

export interface AdminMedicationLogResult {
  list: AdminMedicationLogItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

function withQuery(path: string, qs: URLSearchParams): string {
  const query = qs.toString()
  return query ? `${path}?${query}` : path
}

export async function getMedicationPlans(): Promise<MedicationPlanItem[]> {
  return await http.get<MedicationPlanItem[]>('/api/v1/medication/plans')
}

export async function getMedicationLogs(params: {
  startDate?: string
  endDate?: string
} = {}): Promise<MedicationLogResult> {
  const qs = new URLSearchParams()
  if (params.startDate) qs.set('start_date', params.startDate)
  if (params.endDate) qs.set('end_date', params.endDate)

  const query = qs.toString()
  const path = query ? `/api/v1/medication/logs?${query}` : '/api/v1/medication/logs'
  return await http.get<MedicationLogResult>(path)
}

export async function confirmMedicationLog(
  logId: number,
  status: 'taken' | 'skipped'
): Promise<{ idempotent: boolean; log: MedicationLogItem }> {
  return await http.post<{ idempotent: boolean; log: MedicationLogItem }>('/api/v1/medication/confirm', {
    log_id: logId,
    status,
  })
}

export async function getMedicationSettings(): Promise<MedicationSettings> {
  return await http.get<MedicationSettings>('/api/v1/medication/settings')
}

export async function updateMedicationSettings(payload: Partial<MedicationSettings>): Promise<MedicationSettings> {
  return await http.put<MedicationSettings>('/api/v1/medication/settings', payload)
}

export async function getAdminMedicationLogs(params: {
  page?: number
  pageSize?: number
  search?: string
  status?: '' | 'pending' | 'taken' | 'skipped' | 'missed'
  startDate?: string
  endDate?: string
} = {}): Promise<AdminMedicationLogResult> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  if (params.search) qs.set('search', params.search)
  if (params.status) qs.set('status', params.status)
  if (params.startDate) qs.set('startDate', params.startDate)
  if (params.endDate) qs.set('endDate', params.endDate)

  return await http.get<AdminMedicationLogResult>(withQuery('/api/v1/admin/medication/logs', qs))
}

export async function updateAdminMedicationLogStatus(
  logId: number,
  status: 'pending' | 'taken' | 'skipped' | 'missed'
): Promise<{ id: number; status: string; actualTime: string | null }> {
  return await http.put<{ id: number; status: string; actualTime: string | null }>(
    `/api/v1/admin/medication/logs/${logId}/status`,
    { status }
  )
}
