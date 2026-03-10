import type {
  BloodPressureRecord,
  ElderlyOverview,
  HeartRateRecord,
  TodayMedication,
} from '@/services/types'

export interface SummaryCardViewModel {
  key: string
  title: string
  value: string
  unit?: string
  hint: string
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info'
}

const WEEK_DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function getGreetingText(date = new Date()): string {
  const hour = date.getHours()
  if (hour < 6) return '夜深了，记得休息'
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export function getDateLabel(date = new Date()): string {
  return `${date.getMonth() + 1}月${date.getDate()}日 ${WEEK_DAYS[date.getDay()]}`
}

export function maskDisplayName(userInfo: { phone?: string; nickname?: string } | null): string {
  if (!userInfo) return '银伴用户'
  if (userInfo.nickname) return userInfo.nickname
  if (userInfo.phone) return `${userInfo.phone.slice(0, 3)}****${userInfo.phone.slice(-4)}`
  return '银伴用户'
}

function toneFromStatus(status?: 'normal' | 'warning' | 'danger'): SummaryCardViewModel['tone'] {
  if (status === 'danger') return 'danger'
  if (status === 'warning') return 'warning'
  return 'success'
}

export function buildHealthSummaryCards(args: {
  bloodPressure?: BloodPressureRecord
  heartRate?: HeartRateRecord
  todayMeds: TodayMedication[]
}): SummaryCardViewModel[] {
  const pendingCount = args.todayMeds.filter(item => item.status === 'pending').length
  const takenCount = args.todayMeds.filter(item => item.status === 'taken').length

  return [
    {
      key: 'bp',
      title: '血压',
      value: args.bloodPressure ? `${args.bloodPressure.systolic}/${args.bloodPressure.diastolic}` : '-- / --',
      unit: 'mmHg',
      hint: args.bloodPressure ? '今日最近一次测量' : '今天还没有测量',
      tone: toneFromStatus(args.bloodPressure?.status),
    },
    {
      key: 'hr',
      title: '心率',
      value: args.heartRate ? String(args.heartRate.value) : '--',
      unit: 'bpm',
      hint: args.heartRate ? '今日最近一次测量' : '今天还没有测量',
      tone: toneFromStatus(args.heartRate?.status),
    },
    {
      key: 'medication',
      title: '用药进度',
      value: args.todayMeds.length ? `${takenCount}/${args.todayMeds.length}` : '--',
      unit: '次',
      hint: pendingCount > 0 ? `还有 ${pendingCount} 次待服用` : '今日计划已完成',
      tone: pendingCount > 0 ? 'warning' : 'success',
    },
  ]
}

export function buildFamilySummaryCards(overview: ElderlyOverview | null): SummaryCardViewModel[] {
  if (!overview) {
    return [
      { key: 'online', title: '在线状态', value: '--', hint: '等待绑定长辈后显示', tone: 'info' },
      { key: 'risk', title: '未读提醒', value: '--', hint: '等待绑定长辈后显示', tone: 'warning' },
      { key: 'medication', title: '用药完成度', value: '--', hint: '等待绑定长辈后显示', tone: 'success' },
    ]
  }

  const unreadCount = overview.alerts.filter(item => !item.isRead).length

  return [
    {
      key: 'online',
      title: '在线状态',
      value: overview.isOnline ? '在线' : '离线',
      hint: overview.lastActiveAt ? `最近活跃 ${overview.lastActiveAt}` : '暂无活跃记录',
      tone: overview.isOnline ? 'success' : 'info',
    },
    {
      key: 'alerts',
      title: '未读提醒',
      value: String(unreadCount),
      hint: unreadCount > 0 ? '建议尽快查看异常与告警' : '当前没有待处理提醒',
      tone: unreadCount > 0 ? 'danger' : 'success',
    },
    {
      key: 'medication',
      title: '用药完成度',
      value: `${overview.todayHealth.medicationProgress}%`,
      hint: '今日计划服药进度',
      tone: overview.todayHealth.medicationProgress < 80 ? 'warning' : 'success',
    },
  ]
}
