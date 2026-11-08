export interface UserInfo {
  id: string;
  phone: string;
  name: string;
  nickname?: string;
  real_name?: string;
  avatar?: string;
  birthday?: string;
  gender?: 'male' | 'female';
  id_card?: string;
  address?: string;
  profile_completion?: number;
  emergencyContact?: EmergencyContact[];
  emergency_contact?: EmergencyContact[];
  createdAt: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  isPrimary: boolean;
}

export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
