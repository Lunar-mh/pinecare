import { del, get, post, put } from '../request';
import type { LocationData, SafeZone } from '../types';

export interface FamilyMemberLocation {
  memberId: string;
  memberName: string;
  avatar?: string;
  relation: string;
  location: LocationData;
  isOnline: boolean;
}

type GpsLocationPayload = {
  latitude?: number;
  longitude?: number;
  accuracy?: number | null;
  createdAt?: string;
  updatedAt?: string;
  address?: string;
};

type FencePayload = {
  id?: string | number;
  name?: string;
  centerLat?: number;
  centerLng?: number;
  radius?: number;
  isActive?: boolean;
};

function toLocation(payload?: GpsLocationPayload | null): LocationData {
  const latitude = Number(payload?.latitude || 0);
  const longitude = Number(payload?.longitude || 0);
  const updatedAt = String(payload?.updatedAt || payload?.createdAt || new Date().toISOString());
  const address = String(payload?.address || '').trim() || `经纬度 ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  return { latitude, longitude, address, updatedAt };
}

function toSafeZone(payload: FencePayload): SafeZone {
  return {
    id: String(payload.id || ''),
    name: String(payload.name || '未命名安全区'),
    latitude: Number(payload.centerLat || 0),
    longitude: Number(payload.centerLng || 0),
    radius: Number(payload.radius || 0),
    isActive: Boolean(payload.isActive),
  };
}

export const updateLocation = async (data: { latitude: number; longitude: number; address?: string }) => {
  const response = await post<{ location?: GpsLocationPayload }>('/gps/upload', {
    latitude: data.latitude,
    longitude: data.longitude,
    locationType: 'gps',
  });
  return toLocation(response?.location || { latitude: data.latitude, longitude: data.longitude, address: data.address });
};

export const getCurrentLocation = async () => {
  const response = await get<GpsLocationPayload | null>('/gps/current');
  if (!response) {
    return {
      latitude: 0,
      longitude: 0,
      address: '还没有同步当前位置',
      updatedAt: new Date().toISOString(),
    } as LocationData;
  }
  return toLocation(response);
};

export const getFamilyLocations = async () => {
  const response = await get<{
    elderProfile?: { elderId?: string | number; name?: string; avatarUrl?: string; isOnline?: boolean };
    locationSummary?: { latitude?: number; longitude?: number; address?: string; updatedAt?: string } | null;
  } | null>('/family/elderly-overview');

  if (!response?.elderProfile || !response?.locationSummary) {
    return [] as FamilyMemberLocation[];
  }

  return [{
    memberId: String(response.elderProfile.elderId || ''),
    memberName: String(response.elderProfile.name || '家人'),
    avatar: response.elderProfile.avatarUrl || undefined,
    relation: '家人',
    location: toLocation(response.locationSummary),
    isOnline: Boolean(response.elderProfile.isOnline),
  }];
};

export const getSafeZones = async () => {
  const response = await get<FencePayload[]>('/gps/fences');
  return (response || []).map(toSafeZone);
};

export const createSafeZone = async (data: {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}) => {
  const response = await post<FencePayload>('/gps/fences', {
    name: data.name,
    fenceType: 'circle',
    centerLat: data.latitude,
    centerLng: data.longitude,
    radius: data.radius,
    alertType: 'both',
    isActive: true,
  });
  return toSafeZone(response || {});
};

export const updateSafeZone = async (id: string, data: Partial<SafeZone>) => {
  const response = await put<FencePayload>(`/gps/fences/${id}`, {
    name: data.name,
    centerLat: data.latitude,
    centerLng: data.longitude,
    radius: data.radius,
    isActive: data.isActive,
  });
  return toSafeZone(response || { id });
};

export const deleteSafeZone = async (id: string) => {
  await del<void>(`/gps/fences/${id}`);
};

export const toggleSafeZone = async (id: string, isActive: boolean) => {
  const response = await put<FencePayload>(`/gps/fences/${id}/toggle`, { isActive });
  return toSafeZone(response || { id, isActive });
};
