import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useRole } from '@/hooks/useRole'
import { Icon, HeartIcon, PillIcon, SosIcon, MicIcon, RobotIcon, FamilyIcon, StethoscopeIcon, LocationIcon, ClockIcon, SearchIcon } from '@/components/icons'
import './index.scss'

type ServiceIconName = 'heart' | 'pill' | 'search' | 'stethoscope' | 'sos' | 'location' | 'family' | 'robot' | 'clock' | 'mic'

interface ServiceItem {
  key: string
  label: string
  desc: string
  icon: ServiceIconName
  color: string
  bg: string
  path: string
  badge?: string
}

interface ServiceGroup {
  title: string
  items: ServiceItem[]
}

const SERVICE_GROUPS: ServiceGroup[] = [
  {
    title: '健康管理',
    items: [
      { key: 'health', label: '健康档案', desc: '血压、心率、健康趋势', icon: 'heart', color: '#e53935', bg: '#fce4e4', path: '/subpackages/health/pages/index/index' },
      { key: 'medication', label: '用药提醒', desc: '按时用药，健康生活', icon: 'pill', color: '#fb8c00', bg: '#fff3e0', path: '/subpackages/medication/pages/index/index' },
      { key: 'drug_check', label: '用药安全', desc: '药物相互作用检查', icon: 'search', color: '#6a1b9a', bg: '#f3e5f5', path: '/subpackages/drug_check/pages/index/index' },
      { key: 'ai_consult', label: 'AI健康顾问', desc: '智能分析，专业建议', icon: 'stethoscope', color: '#00695c', bg: '#e0f2f1', path: '/subpackages/ai_consult/pages/index/index', badge: '智能' },
    ]
  },
  {
    title: '安全守护',
    items: [
      { key: 'sos', label: '紧急求助', desc: '一键呼救，守护安全', icon: 'sos', color: '#d32f2f', bg: '#ffebee', path: '/subpackages/sos/pages/index/index' },
      { key: 'location', label: '位置安全', desc: '实时定位，防走失', icon: 'location', color: '#00838f', bg: '#e0f7fa', path: '/subpackages/location/pages/index/index' },
    ]
  },
  {
    title: '社交互动',
    items: [
      { key: 'family', label: '家庭空间', desc: '家庭相册，亲情互动', icon: 'family', color: '#388e3c', bg: '#e8f5e9', path: '/subpackages/family_space/pages/index/index' },
      { key: 'ai_companion', label: 'AI陪伴', desc: '随时倾听，贴心陪伴', icon: 'robot', color: '#ad1457', bg: '#fce4ec', path: '/subpackages/ai_companion/pages/index/index', badge: 'AI' },
      { key: 'timebank', label: '时间银行', desc: '互助养老，存储时间', icon: 'clock', color: '#6a1b9a', bg: '#f3e5f5', path: '/subpackages/timebank/pages/index/index' },
    ]
  },
  {
    title: '医疗服务',
    items: [
      { key: 'medical', label: '在线问诊', desc: '名医坐诊，专业问答', icon: 'stethoscope', color: '#2e7d32', bg: '#e8f5e9', path: '/subpackages/medical/pages/index/index' },
      { key: 'voice', label: '语音助手', desc: '语音操作，无障碍使用', icon: 'mic', color: '#01579b', bg: '#e3f2fd', path: '/subpackages/voice_ai/pages/index/index' },
    ]
  },
]

export default function Services() {
  const { isElder, isFamily } = useRole()

  const navigateTo = (path: string) => {
    Taro.navigateTo({ url: path }).catch((e: unknown) => {
      console.error(e)
      Taro.showToast({ title: '功能开发中，敬请期待', icon: 'none' })
    })
  }

  const gridClass = isFamily ? 'services-grid--family' : 'services-grid--elder'
  const cardClass = isFamily ? 'service-card service-card--family' : 'service-card'

  return (
    <View className="services-page">
      {/* 页头 */}
      <View className="services-header">
        <Text className="services-header__title">全部服务</Text>
        <Text className="services-header__subtitle">专为您定制的健康生活服务</Text>
      </View>

      {/* 分组服务列表 */}
      {SERVICE_GROUPS.map(group => (
        <View key={group.title} className="service-group">
          <View className="service-group__header">
            <Text className="service-group__title">{group.title}</Text>
          </View>
          <View className="service-group__grid">
            <View className={gridClass}>
              {group.items.map((item) => (
                <View
                  key={item.key}
                  className={cardClass}
                  onClick={() => navigateTo(item.path)}
                >
                  {item.badge && (
                    <View className="service-card__badge">
                      <Text className="service-card__badge-text">{item.badge}</Text>
                    </View>
                  )}
                  <View
                    className="service-card__icon"
                    style={{ background: item.bg }}
                  >
                    <Icon name={item.icon} size={isFamily ? 28 : 40} color={item.color} />
                  </View>
                  <Text className="service-card__label">{item.label}</Text>
                  {!isFamily && (
                    <Text className="service-card__desc">{item.desc}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>
      ))}

      <View className="services-footer">
        <Text className="services-footer__text">更多功能持续更新中...</Text>
      </View>
    </View>
  )
}
