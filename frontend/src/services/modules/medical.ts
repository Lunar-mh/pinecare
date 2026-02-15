/**
 * medical.ts - 医疗服务相关API
 */

import { get, post } from '../request';
import type { Doctor, Appointment, MedicalReport, PaginatedResult } from '../types';

// 搜索医生
export const searchDoctors = (params?: {
  keyword?: string;
  department?: string;
  hospital?: string;
  isOnline?: boolean;
  page?: number;
  pageSize?: number;
}) =>
  get<PaginatedResult<Doctor>>('/medical/doctors', params);

// 获取医生详情
export const getDoctorDetail = (id: string) =>
  get<Doctor>(`/medical/doctors/${id}`);

// 创建预约
export const createAppointment = (data: {
  doctorId: string;
  scheduledAt: string;
  type: 'online' | 'offline';
  complaint?: string;
}) =>
  post<Appointment>('/medical/appointments', data);

// 获取我的预约列表
export const getMyAppointments = (params?: {
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  page?: number;
  pageSize?: number;
}) =>
  get<PaginatedResult<Appointment>>('/medical/appointments', params);

// 取消预约
export const cancelAppointment = (id: string) =>
  post<void>(`/medical/appointments/${id}/cancel`, {});

// 获取检查报告列表
export const getMedicalReports = (params?: {
  type?: 'blood' | 'imaging' | 'ecg' | 'other';
  page?: number;
  pageSize?: number;
}) =>
  get<PaginatedResult<MedicalReport>>('/medical/reports', params);

// 上传检查报告
export const uploadMedicalReport = (data: {
  title: string;
  hospital: string;
  reportDate: string;
  type: 'blood' | 'imaging' | 'ecg' | 'other';
  fileUrl: string;
}) =>
  post<MedicalReport>('/medical/reports', data);
