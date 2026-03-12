import http from './api'

export interface SystemIntegrationItem {
  key: string
  provider?: string
  effectiveMode?: string
  requestedMode?: string
  healthy?: boolean
  liveConfigured?: boolean
  fallbackAllowed?: boolean
  lastSuccessAt?: string | null
  lastErrorAt?: string | null
  lastError?: string | null
  recentReceipt?: Record<string, unknown> | null
}

export interface SystemEvidenceBundle {
  runtimeMode: string
  generatedAt: string
  providerEvidence: SystemIntegrationItem[]
  checklist: Array<{ key: string; status: string; detail: string }>
  defenseScripts: Array<{ id: string; title: string; ready: boolean; goal: string; proof: string }>
  replay?: {
    userId: number
    summary: {
      gpsPoints: number
      sosEvents: number
      fallEvents: number
      auditLogs: number
      activeIncidents: number
      deliveryFailures: number
      totalTimelineItems: number
    }
    recommendations: string[]
  } | null
  summary: {
    liveHealthyCount: number
    fallbackCount: number
    recentErrorCount: number
  }
}

export interface SystemEventReplay {
  userId: number
  summary: {
    gpsPoints: number
    sosEvents: number
    fallEvents: number
    auditLogs: number
    activeIncidents: number
    deliveryFailures: number
    totalTimelineItems: number
  }
  recommendations: string[]
  timeline: Array<Record<string, unknown>>
}

export interface DemoBootstrapResult {
  scenarioId: string
  title: string
  status: string
  bootstrapAt: string
  checklist: string[]
  apiSequence: string[]
  replayLog: Array<{ step: number; action: string; status: string; note: string }>
}

function withQuery(path: string, params: URLSearchParams): string {
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

export async function getSystemEvidence(userId?: number): Promise<SystemEvidenceBundle> {
  const qs = new URLSearchParams()
  if (userId) qs.set('userId', String(userId))
  return await http.get<SystemEvidenceBundle>(withQuery('/api/v1/admin/system/evidence', qs))
}

export async function getSystemEventReplay(params: { userId: number; startDate?: string; endDate?: string }): Promise<SystemEventReplay> {
  const qs = new URLSearchParams()
  qs.set('userId', String(params.userId))
  if (params.startDate) qs.set('startDate', params.startDate)
  if (params.endDate) qs.set('endDate', params.endDate)
  return await http.get<SystemEventReplay>(withQuery('/api/v1/admin/system/event-replay', qs))
}

export async function bootstrapDemoScenario(scenarioId: string): Promise<DemoBootstrapResult> {
  return await http.post<DemoBootstrapResult>('/api/v1/admin/system/demo/bootstrap', { scenarioId })
}
