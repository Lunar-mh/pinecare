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
  MagicStick,
  Timer,
  Location,
  Management,
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
    label: '今日态势',
    items: [
      { index: '/dashboard', label: '工作台', subtitle: '今日看板与风险重点', icon: Odometer },
      { index: '/analytics', label: '趋势分析', subtitle: '指标与趋势总览', icon: DataAnalysis },
    ],
  },
  {
    key: 'people',
    label: '人员与关系',
    items: [
      { index: '/users', label: '用户管理', subtitle: '长辈与家属账户', icon: User },
      { index: '/volunteers', label: '志愿者管理', subtitle: '志愿者与角色分层', icon: UserFilled },
      { index: '/family', label: '家庭关系', subtitle: '家庭绑定与协同', icon: House },
    ],
  },
  {
    key: 'care',
    label: '照护与安全',
    items: [
      { index: '/health', label: '健康档案', subtitle: '核心指标与记录', icon: FirstAidKit },
      { index: '/medication', label: '用药计划', subtitle: '提醒、完成度与干预', icon: Memo },
      { index: '/sos', label: 'SOS 告警', subtitle: '高风险事件响应', icon: Warning },
      { index: '/gps', label: '定位守护', subtitle: '位置共享与安全区域', icon: Location },
      { index: '/medical', label: '医疗资源', subtitle: '社区与医疗协同', icon: Management },
      { index: '/fall', label: '跌倒监测', subtitle: '被动风险预警', icon: Bell },
      { index: '/drug', label: '药物相互作用', subtitle: '药物风险识别', icon: MagicStick },
    ],
  },
  {
    key: 'community',
    label: '社区运营',
    items: [
      { index: '/community', label: '社区管理', subtitle: '活动、资源与组织', icon: OfficeBuilding },
      { index: '/timebank', label: '时间银行', subtitle: '服务协同与时长兑换', icon: Timer },
    ],
  },
]

export function findWorkbenchItem(path: string): WorkbenchNavItem | undefined {
  return workbenchNavGroups.flatMap(group => group.items).find(item => item.index === path)
}
