/**
 * medical.ts - 医疗资源相关 API
 */

import { get, post } from '../request'
import type { Doctor, Appointment, MedicalReport, PaginatedResult } from '../types'

export interface MedicalConsultation {
  id: number
  userId: number
  doctorId: number
  department: string
  consultStatus: 'pending' | 'active' | 'completed' | 'cancelled'
  sessionUrl: string | null
  thirdPartySessionId: string | null
  startedAt: string | null
  endedAt: string | null
}

export const searchDoctors = (params?: {
  keyword?: string
  department?: string
  hospital?: string
  isOnline?: boolean
  page?: number
  pageSize?: number
}) =>
  get<PaginatedResult<Doctor>>('/medical/doctors', params)

export const getDoctorDetail = (id: string) =>
  get<Doctor>(`/medical/doctors/${id}`)

export const createAppointment = (data: {
  doctorId: string
  scheduledAt: string
  type: 'online' | 'offline'
  complaint?: string
}) =>
  post<Appointment>('/medical/appointments', data)

export const getMyAppointments = (params?: {
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  page?: number
  pageSize?: number
}) =>
  get<PaginatedResult<Appointment>>('/medical/appointments', params)

export const cancelAppointment = (id: string) =>
  post<void>(`/medical/appointments/${id}/cancel`, {})

export const getMedicalReports = (params?: {
  type?: 'blood' | 'imaging' | 'ecg' | 'other'
  page?: number
  pageSize?: number
}) =>
  get<PaginatedResult<MedicalReport>>('/medical/reports', params)

export const uploadMedicalReport = (data: {
  title: string
  hospital: string
  reportDate: string
  type: 'blood' | 'imaging' | 'ecg' | 'other'
  fileUrl: string
}) =>
  post<MedicalReport>('/medical/reports', data)

export const startMedicalConsultation = (data: {
  doctorId: string
  department: string
}) =>
  post<{ consultation: MedicalConsultation; requestedMode?: string; effectiveMode?: string; liveConfigured?: boolean; fallbackAllowed?: boolean; lastError?: string | null; lastSuccessAt?: string | null }>('/medical/consult/start', data)

export const getMedicalConsultations = (limit = 10) =>
  get<{ list: MedicalConsultation[]; requestedMode?: string; effectiveMode?: string; liveConfigured?: boolean; fallbackAllowed?: boolean; lastError?: string | null; lastSuccessAt?: string | null }>('/medical/consult', { limit })
