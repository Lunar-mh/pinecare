export type AdminWorkbenchRole = 'community-admin' | 'community-manager'

export interface WorkbenchRoleProfile {
  key: AdminWorkbenchRole
  label: string
  subtitle: string
  shiftHint: string
}

export const workbenchRoleProfiles: Record<AdminWorkbenchRole, WorkbenchRoleProfile> = {
  'community-admin': {
    key: 'community-admin',
    label: '社区管理员',
    subtitle: '负责配置、审核、调度与风险响应',
    shiftHint: '今日值班中',
  },
  'community-manager': {
    key: 'community-manager',
    label: '社区负责人',
    subtitle: '负责社区运营、资源协调与执行跟进',
    shiftHint: '运营巡检中',
  },
}

export function resolveWorkbenchRole(value?: string | null): WorkbenchRoleProfile {
  if (value === 'community-manager') return workbenchRoleProfiles['community-manager']
  return workbenchRoleProfiles['community-admin']
}