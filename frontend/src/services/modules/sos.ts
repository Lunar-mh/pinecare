/**
 * sos.ts - SOS 紧急求助相关 API
 */

import { get, post } from '../request';
import type { EmergencyContactWithLocation, SOSEvent } from '../types';

type SosHistoryRow = {
  event_id: number;
  event_status: 'triggered' | 'confirmed' | 'resolved' | 'cancelled';
  trigger_type: 'manual' | 'fall' | 'abnormal_vital';
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  created_at: string;
  confirmed_at?: string | null;
  resolved_at?: string | null;
  cancelled_at?: string | null;
};

function mapHistoryItem(item: SosHistoryRow): SOSEvent {
  return {
    id: String(item.event_id),
    type: item.trigger_type,
    status: item.event_status,
    location:
      item.latitude != null && item.longitude != null
        ? {
            latitude: Number(item.latitude),
            longitude: Number(item.longitude),
            address: item.address || undefined,
          }
        : undefined,
    triggeredAt: item.created_at,
    confirmedAt: item.confirmed_at || undefined,
    resolvedAt: item.resolved_at || item.cancelled_at || undefined,
  };
}

export const triggerSOS = async (data: {
  type: 'manual' | 'fall' | 'abnormal_vital';
  location?: { latitude: number; longitude: number; address?: string };
}): Promise<SOSEvent> => {
  const result = await post<{
    event_id: number;
    event_status: 'triggered' | 'confirmed' | 'resolved' | 'cancelled';
  }>('/sos/trigger', {
    trigger_type: data.type,
    latitude: data.location?.latitude,
    longitude: data.location?.longitude,
    address: data.location?.address,
  });

  return {
    id: String(result.event_id),
    type: data.type,
    status: result.event_status,
    location: data.location,
    triggeredAt: new Date().toISOString(),
  };
};

export const getSOSEvents = async (params: {
  page?: number;
  pageSize?: number;
  status?: 'triggered' | 'confirmed' | 'resolved' | 'cancelled';
}) => {
  const data = await get<{
    list: SosHistoryRow[];
    pagination: {
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
    };
  }>('/sos/history', {
    page: params.page || 1,
    page_size: params.pageSize || 10,
    status: params.status,
  });

  return {
    list: (data.list || []).map(mapHistoryItem),
    total: Number(data.pagination?.total || 0),
    page: Number(data.pagination?.page || params.page || 1),
    pageSize: Number(data.pagination?.page_size || params.pageSize || 10),
    hasMore:
      Number(data.pagination?.page || 1) < Number(data.pagination?.total_pages || 1),
  };
};

export const getCurrentSOSStatus = async () => {
  const data = await getSOSEvents({ page: 1, pageSize: 10 });
  const event = (data.list || []).find(
    item => item.status === 'triggered' || item.status === 'confirmed'
  );

  return {
    active: Boolean(event),
    event,
  };
};

export const cancelSOS = (eventId: string) =>
  post<void>('/sos/cancel', { event_id: Number(eventId) });

export const resolveSOS = (eventId: string) =>
  post<void>('/sos/resolve', { event_id: Number(eventId) });

export const getSOSEvent = async (eventId: string) => {
  const history = await getSOSEvents({ page: 1, pageSize: 50 });
  const target = history.list.find(item => item.id === eventId);
  if (!target) {
    throw new Error('未找到对应 SOS 事件');
  }
  return {
    ...target,
    responders: [],
  };
};

export const getEmergencyContactsWithLocation = async (): Promise<EmergencyContactWithLocation[]> => {
  const contacts = await get<Array<{
    id: number | string;
    name: string;
    phone: string;
    relationship?: string;
    relation?: string;
  }>>('/user/emergency-contacts');

  return (contacts || []).map(item => ({
    id: String(item.id),
    name: item.name,
    phone: item.phone,
    relation: item.relationship || item.relation || '紧急联系人',
    canLocate: false,
  }));
};
