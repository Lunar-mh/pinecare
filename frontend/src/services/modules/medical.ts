import { get, post } from '../request';
import type { Doctor, Appointment, MedicalReport, PaginatedResult } from '../types';

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

type HospitalPayload = { id?: string | number; name?: string };
type DepartmentPayload = { id?: string | number; name?: string; hospitalId?: string | number };

async function resolveDepartmentId(explicit?: string): Promise<number> {
  const directNum = Number(explicit || 0);
  if (Number.isInteger(directNum) && directNum > 0) {
    return directNum;
  }

  const hospitals = await get<{ list?: HospitalPayload[]; source?: string } | HospitalPayload[]>('/medical/hospitals');
  const hospitalList = Array.isArray(hospitals) ? hospitals : hospitals?.list || [];
  const firstHospitalId = Number(hospitalList[0]?.id || 0);
  if (!firstHospitalId) return 32010001;

  const departments = await get<{ list?: DepartmentPayload[] } | DepartmentPayload[]>('/medical/departments', { hospitalId: firstHospitalId });
  const departmentList = Array.isArray(departments) ? departments : departments?.list || [];
  const firstDepartmentId = Number(departmentList[0]?.id || 0);
  return firstDepartmentId || 32010001;
}

function mapDoctor(item: any): Doctor {
  return {
    id: String(item.id || ''),
    name: String(item.name || '医生'),
    title: String(item.title || item.level || '主治医生'),
    department: String(item.department || item.departmentName || '科室'),
    hospital: String(item.hospital || item.hospitalName || '医疗机构'),
    avatar: item.avatar || undefined,
    rating: Number(item.rating || 4.8),
    consultationFee: Number(item.consultationFee || item.fee || 0),
    isOnline: item.isOnline !== false,
    tags: Array.isArray(item.tags) ? item.tags : [],
  };
}

export const searchDoctors = async (params?: {
  keyword?: string
  department?: string
  hospital?: string
  isOnline?: boolean
  page?: number
  pageSize?: number
}) => {
  const departmentId = await resolveDepartmentId(params?.department);
  const response = await get<{ list?: any[]; page?: number; pageSize?: number; total?: number }>('/medical/doctors', {
    departmentId,
    keyword: params?.keyword,
    page: params?.page || 1,
    pageSize: params?.pageSize || 10,
  });

  const list = (response?.list || []).map(mapDoctor);
  const filtered = params?.isOnline ? list.filter((item) => item.isOnline) : list;

  return {
    list: filtered,
    total: Number(response?.total || filtered.length),
    page: Number(response?.page || params?.page || 1),
    pageSize: Number(response?.pageSize || params?.pageSize || 10),
    hasMore: Number(response?.page || 1) * Number(response?.pageSize || 10) < Number(response?.total || filtered.length),
  } as PaginatedResult<Doctor>;
}

export const getDoctorDetail = async (id: string) => {
  const response = await get<{ doctor?: any }>(`/medical/doctors/${id}`)
  return mapDoctor(response?.doctor || {})
}

export const createAppointment = async (data: {
  doctorId: string
  scheduledAt: string
  type: 'online' | 'offline'
  complaint?: string
}) => {
  const doctor = await getDoctorDetail(data.doctorId).catch(() => null);
  const scheduled = new Date(data.scheduledAt || Date.now());
  const appointmentDate = `${scheduled.getFullYear()}-${String(scheduled.getMonth() + 1).padStart(2, '0')}-${String(scheduled.getDate()).padStart(2, '0')}`;
  const startHour = String(scheduled.getHours()).padStart(2, '0');
  const startMinute = String(scheduled.getMinutes()).padStart(2, '0');
  const timeSlot = `${startHour}:${startMinute}-${startHour}:${startMinute}`;

  const response = await post<{ appointment?: any }>('/medical/appointment', {
    hospitalId: Number((doctor as any)?.hospitalId || 31000001),
    doctorId: Number(data.doctorId),
    department: String(doctor?.department || '全科'),
    appointmentDate,
    timeSlot,
  })

  const item = response?.appointment || {};
  return {
    id: String(item.id || ''),
    doctorId: String(item.doctorId || data.doctorId),
    doctorName: doctor?.name || '医生',
    department: String(item.department || doctor?.department || '全科'),
    hospital: String((doctor as any)?.hospital || '医疗机构'),
    scheduledAt: `${item.appointmentDate || appointmentDate}T${(item.timeSlot || `${startHour}:${startMinute}`).slice(0, 5)}:00`,
    status: (item.appointStatus || 'pending') as Appointment['status'],
    type: data.type,
  } as Appointment;
}

export const getMyAppointments = async (params?: {
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  page?: number
  pageSize?: number
}) => {
  const response = await get<{ list?: any[]; page?: number; pageSize?: number; total?: number }>('/medical/appointment', {
    status: params?.status,
    page: params?.page || 1,
    pageSize: params?.pageSize || 10,
  });

  const list = (response?.list || []).map((item) => ({
    id: String(item.id || ''),
    doctorId: String(item.doctorId || ''),
    doctorName: `医生 #${item.doctorId || '--'}`,
    department: String(item.department || '全科'),
    hospital: String(item.hospitalName || `医院 #${item.hospitalId || '--'}`),
    scheduledAt: `${item.appointmentDate || ''}T${String(item.timeSlot || '09:00').slice(0, 5)}:00`,
    status: (item.appointStatus || 'pending') as Appointment['status'],
    type: 'offline' as const,
  }));

  return {
    list,
    total: Number(response?.total || list.length),
    page: Number(response?.page || params?.page || 1),
    pageSize: Number(response?.pageSize || params?.pageSize || 10),
    hasMore: Number(response?.page || 1) * Number(response?.pageSize || 10) < Number(response?.total || list.length),
  } as PaginatedResult<Appointment>;
}

export const cancelAppointment = (id: string) =>
  post<void>(`/medical/appointment/${id}/cancel`, {})

export const getMedicalReports = async (params?: {
  type?: 'blood' | 'imaging' | 'ecg' | 'other'
  page?: number
  pageSize?: number
}) => {
  const response = await get<{ list?: any[]; page?: number; pageSize?: number; total?: number }>('/medical/reports', {
    reportType: params?.type,
    page: params?.page || 1,
    pageSize: params?.pageSize || 10,
  });

  const list = (response?.list || []).map((item) => ({
    id: String(item.id || ''),
    title: String(item.reportTitle || item.title || '体检报告'),
    hospital: String(item.hospitalName || item.hospital || '医疗机构'),
    reportDate: String(item.reportDate || item.createdAt || new Date().toISOString().slice(0, 10)),
    type: (item.reportType || item.type || 'other') as MedicalReport['type'],
    fileUrl: String(item.fileUrl || ''),
  }));

  return {
    list,
    total: Number(response?.total || list.length),
    page: Number(response?.page || params?.page || 1),
    pageSize: Number(response?.pageSize || params?.pageSize || 10),
    hasMore: Number(response?.page || 1) * Number(response?.pageSize || 10) < Number(response?.total || list.length),
  } as PaginatedResult<MedicalReport>;
}

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
