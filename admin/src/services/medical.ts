import http from './api'

export interface MedicalHospitalItem {
  id: number | string
  name: string
  level?: string
  city?: string
}

export interface MedicalDepartmentItem {
  id: number | string
  hospitalId: number | string
  name: string
}

export interface MedicalDoctorItem {
  id: number | string
  departmentId: number | string
  name: string
  title?: string
}

export interface MedicalReportItem {
  id: number
  userId: number
  userName: string
  userPhone: string
  reportNo: string
  reportType: string
  reportDate: string
  reportUrl: string | null
  reportData: Record<string, unknown> | null
  syncStatus: string
  createdAt: string
}

interface MedicalListPayload<T> {
  source: string
  list: T[]
}

export interface AdminMedicalReportResult {
  source: string
  list: MedicalReportItem[]
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

export async function getMedicalHospitals(): Promise<MedicalListPayload<MedicalHospitalItem>> {
  return await http.get<MedicalListPayload<MedicalHospitalItem>>('/api/v1/medical/hospitals')
}

export async function getMedicalDepartments(
  hospitalId: number
): Promise<MedicalListPayload<MedicalDepartmentItem>> {
  const qs = new URLSearchParams()
  qs.set('hospitalId', String(hospitalId))
  return await http.get<MedicalListPayload<MedicalDepartmentItem>>(withQuery('/api/v1/medical/departments', qs))
}

export async function getMedicalDoctors(
  departmentId: number
): Promise<MedicalListPayload<MedicalDoctorItem>> {
  const qs = new URLSearchParams()
  qs.set('departmentId', String(departmentId))
  return await http.get<MedicalListPayload<MedicalDoctorItem>>(withQuery('/api/v1/medical/doctors', qs))
}

export async function getAdminMedicalReports(params: {
  page?: number
  pageSize?: number
  search?: string
  reportType?: string
  startDate?: string
  endDate?: string
} = {}): Promise<AdminMedicalReportResult> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  if (params.search) qs.set('search', params.search)
  if (params.reportType) qs.set('reportType', params.reportType)
  if (params.startDate) qs.set('startDate', params.startDate)
  if (params.endDate) qs.set('endDate', params.endDate)

  return await http.get<AdminMedicalReportResult>(withQuery('/api/v1/admin/medical/reports', qs))
}
