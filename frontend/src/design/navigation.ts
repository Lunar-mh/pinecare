import type { IconName } from '@/components/icons'

export interface NavAction {
  key: string
  label: string
  description: string
  icon: IconName
  path: string
  badge?: string
}

export interface ServiceCluster {
  key: string
  title: string
  description: string
  items: NavAction[]
}

export interface ProfileSection {
  key: string
  title: string
  items: NavAction[]
}

export const appTabs = [
  { key: 'home', label: '首页', pagePath: 'pages/index/index' },
  { key: 'services', label: '守护服务', pagePath: 'pages/services/index' },
  { key: 'profile', label: '我的', pagePath: 'pages/profile/index' },
] as const

export const homeQuickActionsByRole: Record<'elder' | 'family', NavAction[]> = {
  elder: [
    { key: 'health', label: '健康总览', description: '查看血压、心率与趋势', icon: 'heart', path: '/subpackages/health/pages/index/index' },
    { key: 'medication', label: '今日用药', description: '按时服药与补服提醒', icon: 'pill', path: '/subpackages/medication/pages/index/index' },
    { key: 'location', label: '位置共享', description: '同步安全位置给家人', icon: 'location', path: '/subpackages/location/pages/index/index' },
    { key: 'sos', label: '紧急求助', description: '一键求助并通知家人', icon: 'sos', path: '/subpackages/sos/pages/index/index', badge: '重要' },
  ],
  family: [
    { key: 'overview', label: '长辈状态', description: '查看今日状态与健康提醒', icon: 'heart', path: '/subpackages/health/pages/index/index' },
    { key: 'location', label: '实时定位', description: '查看位置共享与安全区域', icon: 'location', path: '/subpackages/location/pages/index/index' },
    { key: 'medication', label: '用药监督', description: '查看今日用药与服药打卡', icon: 'pill', path: '/subpackages/medication/pages/index/index' },
    { key: 'sos', label: '紧急告警', description: 'SOS 事件响应与处置', icon: 'sos', path: '/subpackages/sos/pages/index/index', badge: '重要' },
  ],
}

export const serviceClustersByRole: Record<'elder' | 'family', ServiceCluster[]> = {
  elder: [
    {
      key: 'health',
      title: '健康管理',
      description: '核心数据、趋势与用药都在这里。',
      items: [
        { key: 'health', label: '健康档案', description: '血压、心率、趋势', icon: 'heart', path: '/subpackages/health/pages/index/index' },
        { key: 'medication', label: '用药提醒', description: '计划、进度、补服', icon: 'pill', path: '/subpackages/medication/pages/index/index' },
      ],
    },
    {
      key: 'care',
      title: '安全守护',
      description: '风险先看见，紧急情况可立刻处理。',
      items: [
        { key: 'sos', label: '紧急 SOS', description: '长按求助并共享位置', icon: 'sos', path: '/subpackages/sos/pages/index/index', badge: '高优先' },
        { key: 'location', label: '位置共享', description: '同步给家人更安心', icon: 'location', path: '/subpackages/location/pages/index/index' },
      ],
    },
    {
      key: 'service',
      title: '设备与紧急设置',
      description: '绑定监测设备与维护求助联系人。',
      items: [
        { key: 'device', label: '设备连接', description: '管理手环与血压计', icon: 'phone', path: '/subpackages/settings/pages/device/index' },
        { key: 'emergency', label: '紧急联系人', description: '维护求助电话与顺序', icon: 'alert', path: '/subpackages/settings/pages/emergency/index' },
      ],
    },
  ],
  family: [
    {
      key: 'watch',
      title: '监护中心',
      description: '关注长辈状态、告警和位置。',
      items: [
        { key: 'health', label: '健康总览', description: '查看血压、心率和提醒', icon: 'heart', path: '/subpackages/health/pages/index/index' },
        { key: 'location', label: '定位追踪', description: '实时位置与地图查看', icon: 'location', path: '/subpackages/location/pages/index/index' },
        { key: 'sos', label: 'SOS 事件', description: '快速处理紧急求助', icon: 'sos', path: '/subpackages/sos/pages/index/index', badge: '告警' },
      ],
    },
    {
      key: 'coordination',
      title: '服务协调',
      description: '用药监督与家庭成员协同。',
      items: [
        { key: 'medication', label: '用药进度', description: '查看今日计划与完成度', icon: 'pill', path: '/subpackages/medication/pages/index/index' },
        { key: 'family_manage', label: '家庭管理', description: '长辈绑定与协同配置', icon: 'settings', path: '/pages/family-manage/index' },
      ],
    },
  ],
}

export const profileSectionsByRole: Record<'elder' | 'family', ProfileSection[]> = {
  elder: [
    {
      key: 'device',
      title: '设备与紧急设置',
      items: [
        { key: 'device', label: '设备连接', description: '管理手环和设备状态', icon: 'phone', path: '/subpackages/settings/pages/device/index' },
        { key: 'emergency', label: '紧急联系人', description: '维护求助联系人', icon: 'alert', path: '/subpackages/settings/pages/emergency/index' },
      ],
    },
    {
      key: 'service',
      title: '服务设置',
      items: [
        { key: 'settings', label: '通用设置', description: '声音、通知与偏好', icon: 'settings', path: '/subpackages/settings/pages/index/index' },
        { key: 'feedback', label: '意见反馈', description: '告诉我们哪里还不顺手', icon: 'info', path: '/subpackages/settings/pages/feedback/index' },
        { key: 'about', label: '关于银伴', description: '版本与产品说明', icon: 'info', path: '/subpackages/settings/pages/about/index' },
      ],
    },
  ],
  family: [
    {
      key: 'service',
      title: '守护设置',
      items: [
        { key: 'location', label: '位置共享', description: '查看与管理安全区域', icon: 'location', path: '/subpackages/location/pages/index/index' },
        { key: 'emergency', label: '紧急设置', description: '管理告警和联系人', icon: 'alert', path: '/subpackages/settings/pages/emergency/index' },
        { key: 'settings', label: '通用设置', description: '通知、声音与偏好', icon: 'settings', path: '/subpackages/settings/pages/index/index' },
      ],
    },
    {
      key: 'about',
      title: '支持与关于',
      items: [
        { key: 'feedback', label: '意见反馈', description: '反馈问题与建议', icon: 'info', path: '/subpackages/settings/pages/feedback/index' },
        { key: 'about', label: '关于银伴', description: '版本、协议与产品介绍', icon: 'info', path: '/subpackages/settings/pages/about/index' },
      ],
    },
  ],
}
