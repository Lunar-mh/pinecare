import http from './api'

export type DrugRiskLevel = 'high' | 'medium' | 'low'
export type DrugRecordStatus = 'pending' | 'acknowledged'

export interface DrugInteractionRecord {
  id: number
  userId: number
  userName?: string
  userPhone?: string
  drugA: string
  drugB: string
  level: DrugRiskLevel
  mechanism: string
  riskDescription: string
  suggestion: string
  status: DrugRecordStatus
  checkBatchId: string
  createdAt: string
}

export async function getDrugInteractionHistory(
  status?: DrugRecordStatus
): Promise<DrugInteractionRecord[]> {
  const qs = new URLSearchParams()
  if (status) qs.set('status', status)
  const query = qs.toString()
  const path = query ? `/api/v1/admin/drug-interactions?${query}` : '/api/v1/admin/drug-interactions'
  return await http.get<DrugInteractionRecord[]>(path)
}

export async function acknowledgeDrugInteraction(id: number): Promise<DrugInteractionRecord> {
  return await http.put<DrugInteractionRecord>(`/api/v1/admin/drug-interactions/${id}/status`, {
    status: 'acknowledged',
  })
}
