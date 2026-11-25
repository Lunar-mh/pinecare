import type { ActivityItem } from '@/services'

const EVENT_TYPE_RULES: Array<[string, string]> = [
  ['sos', 'SOS 紧急求助'],
  ['fall', '疑似跌倒预警'],
  ['medication', '用药遗漏提醒'],
  ['gps', '越界定位告警'],
  ['location', '越界定位告警'],
]

const EVENT_STATUS_RULES: Array<[string, string]> = [
  ['trigger', '触发处置中'],
  ['confirm', '已指派确认'],
  ['resolve', '已闭环处置'],
  ['complete', '已闭环处置'],
  ['cancel', '已安全解除'],
  ['pending', '排队待响应'],
  ['processing', '上门核实中'],
]

export function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--:--'
  return date.toLocaleTimeString('zh-CN', { hour12: false })
}

export function isDanger(item: ActivityItem): boolean {
  const normalizedStatus = item.status.toLowerCase()
  const normalizedType = item.type.toLowerCase()
  return normalizedStatus.includes('trigger') || normalizedType.includes('sos') || normalizedType.includes('fall')
}

export function formatEventType(value: string): string {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return '未知事件'
  const matched = EVENT_TYPE_RULES.find(([pattern]) => normalized.includes(pattern))
  return matched ? matched[1] : String(value || '')
}

export function formatEventStatus(value: string): string {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return '待响应'
  const matched = EVENT_STATUS_RULES.find(([pattern]) => normalized.includes(pattern))
  return matched ? matched[1] : String(value || '')
}

export function eventDesc(item: ActivityItem): string {
  return `${formatEventType(item.type)} - ${formatEventStatus(item.status)}`
}

export function formatEventUser(value: string): string {
  const raw = String(value || '').trim()
  const elderMatch = /^elder[_-]?(\d+)$/i.exec(raw)
  if (elderMatch) return `长者 ${elderMatch[1]} 号`
  const familyMatch = /^family[_-]?(\d+)$/i.exec(raw)
  if (familyMatch) return `家属 ${familyMatch[1]} 号`
  const volunteerMatch = /^volunteer[_-]?(\d+)$/i.exec(raw)
  if (volunteerMatch) return `守护员 ${volunteerMatch[1]} 号`
  return raw || '社区长者'
}
