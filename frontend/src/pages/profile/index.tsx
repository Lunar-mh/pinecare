import { useEffect, useState } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { HeroHeader, PageShell, SectionBlock } from '@/components/shell'
import { Icon, UserIcon } from '@/components/icons'
import { profileSectionsByRole } from '@/design/navigation'
import { useRole } from '@/hooks/useRole'
import './index.scss'

export default function ProfilePage() {
  const [userInfo, setUserInfo] = useState<{ phone?: string; nickname?: string; id?: string } | null>(null)
  const { role, setRole } = useRole()

  useEffect(() => {
    try {
      const info = Taro.getStorageSync('userInfo')
      if (info) {
        setUserInfo(JSON.parse(info) as { phone?: string; nickname?: string; id?: string })
      }
    } catch (_) {
      setUserInfo(null)
    }
  }, [])

  const displayName = userInfo?.nickname || userInfo?.phone || '银伴用户'
  const sections = profileSectionsByRole[role]

  const navigateByPath = (path: string) => {
    if (path.startsWith('/pages/')) {
      Taro.switchTab({ url: path })
      return
    }
    Taro.navigateTo({ url: path })
  }

  const handleLogout = () => {
    Taro.clearStorageSync()
    Taro.reLaunch({ url: '/pages/login/index' })
  }

  return (
    <PageShell roleTone={role === 'elder' ? 'elder' : 'family'} className="profile-dashboard">
      <HeroHeader
        roleTone={role === 'elder' ? 'elder' : 'family'}
        eyebrow={role === 'elder' ? '身份卡' : '家庭守护身份'}
        title={role === 'elder' ? '我的照护设置与家庭关系' : '我的守护设置与家庭关系'}
        subtitle="把角色切换、设备、紧急设置和关于信息收纳在同一页。"
      />

      <View className="profile-card">
        <View className="profile-card__avatar"><UserIcon size={28} color="#fff" /></View>
        <View className="profile-card__body">
          <Text className="profile-card__name">{displayName}</Text>
          <Text className="profile-card__meta">{userInfo?.phone || '登录后会同步手机号'} · {role === 'elder' ? '长辈身份' : '家属身份'}</Text>
        </View>
      </View>

      <View className="profile-role-switch">
        <View className={`profile-role-switch__item ${role === 'elder' ? 'profile-role-switch__item--active' : ''}`} onClick={() => setRole('elder')}>
          <Text>长辈模式</Text>
        </View>
        <View className={`profile-role-switch__item profile-role-switch__item--family ${role === 'family' ? 'profile-role-switch__item--active' : ''}`} onClick={() => setRole('family')}>
          <Text>家属模式</Text>
        </View>
      </View>

      {sections.map(section => (
        <SectionBlock key={section.key} title={section.title}>
          <View className="profile-list">
            {section.items.map(item => (
              <View key={item.key} className="profile-list__item" onClick={() => navigateByPath(item.path)}>
                <View className="profile-list__icon"><Icon name={item.icon} size={22} color={role === 'elder' ? '#2f6c5b' : '#c97b55'} /></View>
                <View className="profile-list__body">
                  <Text className="profile-list__title">{item.label}</Text>
                  <Text className="profile-list__desc">{item.description}</Text>
                </View>
                <Icon name="arrow-right" size={18} color="#8d98a3" />
              </View>
            ))}
          </View>
        </SectionBlock>
      ))}

      <Button className="profile-logout" onClick={handleLogout}>退出登录</Button>
      <Text className="profile-version">银伴前端体验重构版 · v1.0.0</Text>
    </PageShell>
  )
}
