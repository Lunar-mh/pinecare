import type { ActivityItem, StatItem } from '@/services/dashboard'

export interface WorkbenchCard {
  label: string
  value: string
  unit?: string
  tone: 'primary' | 'success' | 'warning' | 'danger'
  hint: string
}

export interface RiskItem {
  title: string
  description: string
  level: '高优先' | '跟进中' | '平稳'
}

export function buildWorkbenchCards(stats: StatItem[]): WorkbenchCard[] {
  if (!stats.length) {
    return [
      { label: '活跃用户', value: '--', unit: '人', tone: 'primary', hint: '等待实时数据接入' },
      { label: '健康记录', value: '--', unit: '条', tone: 'success', hint: '今日新增数据待同步' },
      { label: '待处理工单', value: '--', unit: '单', tone: 'warning', hint: '高优任务会在这里出现' },
      { label: '进行中 SOS', value: '--', unit: '条', tone: 'danger', hint: '需要值班同学优先关注' },
    ]
  }

  const tones: WorkbenchCard['tone'][] = ['primary', 'success', 'warning', 'danger']
  const hints = ['覆盖长辈与家属两侧', '来自健康同步与手动录入', '包括异常提醒和待办处理', '高风险事件优先级最高']

  return stats.slice(0, 4).map((item, index) => ({
    label: item.label,
    value: item.value,
    unit: item.unit,
    tone: tones[index] || 'primary',
    hint: hints[index] || '持续观察中',
  }))
}

export function buildRiskItems(activities: ActivityItem[]): RiskItem[] {
  if (!activities.length) {
    return [
      { title: '暂无高风险事项', description: '当前没有需要立即升级处理的事件。', level: '平稳' },
      { title: '建议关注位置异常', description: '定位共享、SOS 和离线状态建议作为后续重点。', level: '跟进中' },
    ]
  }

  return activities.slice(0, 3).map((item, index) => ({
    title: item.type,
    description: `${item.user} · ${item.time} · ${item.status}`,
    level: index === 0 ? '高优先' : index === 1 ? '跟进中' : '平稳',
  }))
}
