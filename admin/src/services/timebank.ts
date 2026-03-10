import http from './api'

export interface TimeBankLeaderboardItem {
  rank: number
  userId: number
  balance: number
  totalEarned: number
  creditScore: number
  creditLevel: string
}

export interface TimeBankServiceRecord {
  id: number
  providerId: number
  providerName?: string
  recipientId: number
  recipientName?: string
  serviceType: string
  startTime: string
  endTime: string
  durationHours: number
  timeCoins: number
  status: 'pending' | 'confirmed' | 'cancelled'
  createdAt: string
}

export interface TimeBankServiceHistoryResult {
  list: TimeBankServiceRecord[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface TimeBankExchangeRecord {
  id: number
  userId: number
  exchangeType: string
  itemName: string
  coinsRequired: number
  status: string
  createdAt: string
  completedAt: string | null
}

export interface TimeBankServiceHistoryParams {
  page?: number
  pageSize?: number
  status?: 'pending' | 'confirmed' | 'cancelled'
  type?: 'provided' | 'received'
  search?: string
}

function withQuery(path: string, qs: URLSearchParams): string {
  const query = qs.toString()
  return query ? `${path}?${query}` : path
}

export async function getTimeBankLeaderboard(communityId?: number): Promise<TimeBankLeaderboardItem[]> {
  const qs = new URLSearchParams()
  if (communityId) qs.set('communityId', String(communityId))
  return await http.get<TimeBankLeaderboardItem[]>(withQuery('/api/v1/admin/time-bank/leaderboard', qs))
}

export async function getTimeBankServiceHistory(
  params: TimeBankServiceHistoryParams = {}
): Promise<TimeBankServiceHistoryResult> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  if (params.status) qs.set('status', params.status)
  if (params.type) qs.set('type', params.type)
  if (params.search) qs.set('search', params.search)

  return await http.get<TimeBankServiceHistoryResult>(withQuery('/api/v1/admin/time-bank/service/history', qs))
}

export async function confirmTimeBankService(
  recordId: number,
  action: 'confirm' | 'cancel'
): Promise<{ recordId: number; status: 'confirmed' | 'cancelled' }> {
  return await http.post<{ recordId: number; status: 'confirmed' | 'cancelled' }>(
    '/api/v1/admin/time-bank/service/confirm',
    {
      recordId,
      action,
    }
  )
}

export async function getTimeBankExchangeHistory(): Promise<TimeBankExchangeRecord[]> {
  return await http.get<TimeBankExchangeRecord[]>('/api/v1/admin/time-bank/exchange/history')
}

