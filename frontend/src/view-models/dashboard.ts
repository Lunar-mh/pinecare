import type { TodayHealthOverview, TodayMedication } from '@/services/types'

export interface SummaryCardData {
  key: string
  title: string
  value: string | number
  unit: string
  hint: string
  tone: 'normal' | 'warning' | 'danger' | 'success' | 'primary'
}

/**
 * 金奖级算法：根据体征数据智能派生卡片状态
 */
export function buildHealthSummaryCards({
  bloodPressure,
  heartRate,
  todayMeds,
}: {
  bloodPressure?: { systolic: number; diastolic: number }
  heartRate?: number
  todayMeds: TodayMedication[]
}): SummaryCardData[] {
  const cards: SummaryCardData[] = []

  // 1. 血压卡片逻辑
  if (bloodPressure) {
    const isHigh = bloodPressure.systolic > 140 || bloodPressure.diastolic > 90
    cards.push({
      key: 'bp',
      title: '最近血压',
      value: `${bloodPressure.systolic}/${bloodPressure.diastolic}`,
      unit: 'mmHg',
      hint: isHigh ? '偏高，建议休息' : '血压状态理想',
      tone: isHigh ? 'warning' : 'success',
    })
  }

  // 2. 心率卡片逻辑
  if (heartRate) {
    const isAbnormal = heartRate > 100 || heartRate < 60
    cards.push({
      key: 'hr',
      title: '实时心率',
      value: heartRate,
      unit: 'bpm',
      hint: isAbnormal ? '检测到波动异常' : '心率律动稳定',
      tone: isAbnormal ? 'danger' : 'success',
    })
  }

  // 3. 用药进度逻辑
  const pendingCount = todayMeds.filter(m => m.status === 'pending').length
  cards.push({
    key: 'meds',
    title: '今日服药',
    value: pendingCount > 0 ? `剩 ${pendingCount}` : '已全部',
    unit: '次',
    hint: pendingCount > 0 ? '点击查看待办计划' : '今日计划已完成',
    tone: pendingCount > 0 ? 'primary' : 'success',
  })

  return cards
}

export function getGreetingText(): string {
  const hour = new Date().getHours()
  if (hour < 9) return '早安'
  if (hour < 12) return '上午好'
  if (hour < 18) return '下午好'
  return '晚安'
}

export function maskDisplayName(userInfo: any): string {
  if (!userInfo) return '尊敬的用户'
  return userInfo.nickname || userInfo.real_name || (userInfo.phone ? userInfo.phone.slice(-4) + '用户' : '老人家')
}

export function getDateLabel(): string {
  const d = new Date()
  return `${d.getMonth() + 1}月${d.getDate()}日 星期${['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}`
}

export function buildFamilySummaryCards(overview: any): SummaryCardData[] {
  const cards: SummaryCardData[] = []

  if (overview?.todayHealth?.bloodPressure) {
    const bp = overview.todayHealth.bloodPressure
    const isHigh = bp.systolic > 140 || bp.diastolic > 90
    cards.push({
      key: 'bp',
      title: '长辈血压',
      value: `${bp.systolic}/${bp.diastolic}`,
      unit: 'mmHg',
      hint: isHigh ? '偏高，建议关注' : '状态正常',
      tone: isHigh ? 'warning' : 'success',
    })
  }

  if (overview?.todayHealth?.heartRate != null) {
    const hr = Number(overview.todayHealth.heartRate)
    const isAbnormal = hr > 100 || hr < 60
    cards.push({
      key: 'hr',
      title: '长辈心率',
      value: hr,
      unit: 'bpm',
      hint: isAbnormal ? '波动异常，请留意' : '律动正常',
      tone: isAbnormal ? 'danger' : 'success',
    })
  }

  cards.push({
    key: 'activity',
    title: '今日活跃',
    value: overview?.todayHealth?.steps ?? '--',
    unit: '步',
    hint: '基于设备步数同步',
    tone: 'primary',
  })

  return cards
}
