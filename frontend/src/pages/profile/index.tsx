import { useEffect, useMemo, useState } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { HeroHeader, PageShell, SectionBlock } from '@/components/shell'
import { Icon, UserIcon, type IconName } from '@/components/icons'
import { getUserInfo, getUserPageConfig, type PageConfigNavAction } from '@/services'
import { useRole } from '@/hooks/useRole'
import './index.scss'

type SectionItem = {
  key: string
  title: string
  items: PageConfigNavAction[]
}

type DisplayUser = {
  nickname?: string
  name?: string
  phone?: string
  id?: string
}

export default function ProfilePage() {
  const [userInfo, setUserInfo] = useState<DisplayUser | null>(null)
  const [sectionsByRole, setSectionsByRole] = useState<Record<'elder' | 'family', SectionItem[]>>({ elder: [], family: [] })
  const [appVersion, setAppVersion] = useState('1.0.0')
  const [completion, setCompletion] = useState(0)
  const [loading, setLoading] = useState(true)
  const { role, setRole } = useRole()

  useEffect(() => {
    let mounted = true

    const loadPage = async () => {
      setLoading(true)
      try {
        const [profile, config] = await Promise.all([getUserInfo(), getUserPageConfig()])
        if (!mounted) return

        setUserInfo({
          id: String(profile.id || ''),
          name: profile.name,
          nickname: profile.name,
          phone: profile.phone,
        })

        setSectionsByRole({
          elder: config.profileSectionsByRole.elder || [],
          family: config.profileSectionsByRole.family || [],
        })
        setAppVersion(config.profileMeta?.appVersion || '1.0.0')
        setCompletion(Number(config.profileMeta?.completion || 0))
      } catch (_error) {
        if (!mounted) return

        try {
          const localInfo = Taro.getStorageSync('userInfo')
          if (localInfo) {
            const parsed = JSON.parse(localInfo) as DisplayUser
            setUserInfo(parsed)
          }
        } catch (_storageError) {
          setUserInfo(null)
        }

        setSectionsByRole({ elder: [], family: [] })
        Taro.showToast({ title: '个人中心加载失败，请稍后重试', icon: 'none' })
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadPage()

    return () => {
      mounted = false
    }
  }, [])

  const displayName = useMemo(() => {
    if (userInfo?.nickname) return userInfo.nickname
    if (userInfo?.name) return userInfo.name
    if (userInfo?.phone) return userInfo.phone
    return '银伴用户'
  }, [userInfo])

  const sections = sectionsByRole[role] || []

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
    <PageShell roleTone={role === 'elder' ? 'elder' : 'family'} className="profile-dashboard" loading={loading}>
      <HeroHeader
        roleTone={role === 'elder' ? 'elder' : 'family'}
        eyebrow={role === 'elder' ? '身份卡' : '家庭守护身份'}
        title={role === 'elder' ? '我的照护设置与家庭关系' : '我的守护设置与家庭关系'}
        subtitle={role === 'elder' ? '管理您的个人信息与系统设置' : '管理家庭设置与长辈资料'}
      />

      <View className="profile-card">
        <View className="profile-card__avatar"><UserIcon size={28} color="#fff" /></View>
        <View className="profile-card__body">
          <Text className="profile-card__name">{displayName}</Text>
          <Text className="profile-card__meta">
            {userInfo?.phone || '未绑定手机号'} · {role === 'elder' ? '长辈身份' : '家属身份'} · 资料完整度 {completion}%
          </Text>
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

      {sections.map((section) => (
        <SectionBlock key={section.key} title={section.title}>
          <View className="profile-list">
            {section.items.map((item) => (
              <View key={item.key} className="profile-list__item" onClick={() => navigateByPath(item.path)}>
                <View className="profile-list__icon"><Icon name={item.icon as IconName} size={22} color={role === 'elder' ? '#2f6c5b' : '#c97b55'} /></View>
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
      <Text className="profile-version">银伴前端版本 · v{appVersion}</Text>
    </PageShell>
  )
}
