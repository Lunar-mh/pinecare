/**
 * location.ts - 位置安全相关API
 */

import { get, post } from '../request';
import type { LocationData, SafeZone } from '../types';

export interface FamilyMemberLocation {
  memberId: string;
  memberName: string;
  avatar?: string;
  relation: string;
  location: LocationData;
  isOnline: boolean;
}

// 上报当前位置
export const updateLocation = (data: { latitude: number; longitude: number; address?: string }) =>
  post<LocationData>('/location/update', data);

// 获取当前位置
export const getCurrentLocation = () =>
  get<LocationData>('/location/current');

// 获取家人位置列表
export const getFamilyLocations = () =>
  get<FamilyMemberLocation[]>('/location/family');

// 获取安全区域列表
export const getSafeZones = () =>
  get<SafeZone[]>('/location/safe-zones');

// 创建安全区域
export const createSafeZone = (data: {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}) =>
  post<SafeZone>('/location/safe-zones', data);

// 更新安全区域
export const updateSafeZone = (id: string, data: Partial<SafeZone>) =>
  post<SafeZone>(`/location/safe-zones/${id}`, data);

// 删除安全区域
export const deleteSafeZone = (id: string) =>
  post<void>(`/location/safe-zones/${id}/delete`, {});

// 切换安全区域激活状态
export const toggleSafeZone = (id: string, isActive: boolean) =>
  post<SafeZone>(`/location/safe-zones/${id}/toggle`, { isActive });
