import type { Component } from 'vue'
import {
  Odometer,
  User,
  DataAnalysis,
  OfficeBuilding,
  UserFilled,
  FirstAidKit,
  Memo,
  Warning,
  House,
  Bell,
  Timer,
  Location,
} from '@element-plus/icons-vue'

export interface WorkbenchNavItem {
  index: string
  label: string
  subtitle: string
  icon: Component
}

export interface WorkbenchNavGroup {
  key: string
  label: string
  items: WorkbenchNavItem[]
}

export const workbenchNavGroups: WorkbenchNavGroup[] = [
  {
    key: 'overview',
    label: '态势总览',
    items: [
      { index: '/dashboard', label: '今日工作台', subtitle: '关键指标、风险清单与待处理任务', icon: Odometer },
      { index: '/analytics', label: '趋势分析', subtitle: '指标变化与运营趋势概览', icon: DataAnalysis },
    ],
  },
  {
    key: 'people',
    label: '人员与关系',
    items: [
      { index: '/users', label: '用户管理', subtitle: '长辈与家属账户', icon: User },
      { index: '/family', label: '家庭关系', subtitle: '绑定状态与协同情况', icon: House },
      { index: '/volunteers', label: '志愿者管理', subtitle: '花名册、审核、排班与绩效', icon: UserFilled },
    ],
  },
  {
    key: 'care',
    label: '照护与风险',
    items: [
      { index: '/health', label: '健康监管', subtitle: '核心指标与健康记录', icon: FirstAidKit },
      { index: '/medication', label: '用药监管', subtitle: '提醒、完成度与异常干预', icon: Memo },
      { index: '/sos', label: 'SOS 风险中心', subtitle: '紧急事件响应与闭环', icon: Warning },
      { index: '/gps', label: '定位风险中心', subtitle: '位置共享与安全区域', icon: Location },
      { index: '/fall', label: '跌倒监测', subtitle: '被动风险预警与策略调整', icon: Bell },
    ],
  },
  {
    key: 'community',
    label: '社区运营',
    items: [
      { index: '/community', label: '社区管理', subtitle: '活动、资源与组织运行', icon: OfficeBuilding },
      { index: '/timebank', label: '时间银行审核', subtitle: '服务记录、兑换与贡献排名', icon: Timer },
    ],
  },
]

export function findWorkbenchItem(path: string): WorkbenchNavItem | undefined {
  return workbenchNavGroups.flatMap(group => group.items).find(item => item.index === path)
}