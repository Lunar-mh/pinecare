import { get, post } from '../request';
import type { EmergencyContactWithLocation, SOSEvent } from '../types';

type SosHistoryRow = {
  eventId?: number;
  event_id?: number;
  eventStatus?: 'triggered' | 'confirmed' | 'resolved' | 'cancelled';
  event_status?: 'triggered' | 'confirmed' | 'resolved' | 'cancelled';
  triggerType?: 'manual' | 'fall' | 'abnormal_vital';
  trigger_type?: 'manual' | 'fall' | 'abnormal_vital';
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  createdAt?: string;
  created_at?: string;
  confirmedAt?: string | null;
  confirmed_at?: string | null;
  resolvedAt?: string | null;
  resolved_at?: string | null;
  cancelledAt?: string | null;
  cancelled_at?: string | null;
};

function mapHistoryItem(item: SosHistoryRow): SOSEvent {
  const eventId = Number(item.event_id ?? item.eventId ?? 0);
  const triggerType = item.trigger_type ?? item.triggerType ?? 'manual';
  const eventStatus = item.event_status ?? item.eventStatus ?? 'triggered';
  const createdAt = item.created_at ?? item.createdAt ?? new Date().toISOString();
  const confirmedAt = item.confirmed_at ?? item.confirmedAt ?? undefined;
  const resolvedAt = item.resolved_at ?? item.resolvedAt ?? undefined;
  const cancelledAt = item.cancelled_at ?? item.cancelledAt ?? undefined;

  return {
    id: String(eventId),
    type: triggerType,
    status: eventStatus,
    location:
      item.latitude != null && item.longitude != null
        ? {
            latitude: Number(item.latitude),
            longitude: Number(item.longitude),
            address: item.address || undefined,
          }
        : undefined,
    triggeredAt: createdAt,
    confirmedAt: confirmedAt || undefined,
    resolvedAt: resolvedAt || cancelledAt || undefined,
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
      page_size?: number;
      pageSize?: number;
      total: number;
      total_pages?: number;
      totalPages?: number;
    };
  }>('/sos/history', {
    page: params.page || 1,
    page_size: params.pageSize || 10,
    status: params.status,
  });

  const currentPage = Number(data.pagination?.page || params.page || 1);
  const currentPageSize = Number(data.pagination?.page_size || data.pagination?.pageSize || params.pageSize || 10);
  const totalPages = Number(data.pagination?.total_pages || data.pagination?.totalPages || 1);

  return {
    list: (data.list || []).map(mapHistoryItem),
    total: Number(data.pagination?.total || 0),
    page: currentPage,
    pageSize: currentPageSize,
    hasMore: currentPage < totalPages,
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
  const normalizedId = Number(eventId);

  try {
    const event = await get<SosHistoryRow>(`/sos/events/${normalizedId}`);
    return {
      ...mapHistoryItem(event),
      responders: [],
    };
  } catch (_error) {
    const history = await getSOSEvents({ page: 1, pageSize: 50 });
    const target = history.list.find(item => item.id === eventId);
    if (!target) {
      throw new Error('SOS event not found.');
    }
    return {
      ...target,
      responders: [],
    };
  }
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
    relation: item.relationship || item.relation || 'Emergency Contact',
    canLocate: false,
  }));
};
