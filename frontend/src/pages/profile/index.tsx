import { useEffect, useMemo, useState } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { HeroHeader, PageShell, SectionBlock } from '@/components/shell'
import { Icon, UserIcon, type IconName } from '@/components/icons'
import { getUserInfo } from '@/services'
import { useRole } from '@/hooks/useRole'
import { profileSectionsByRole } from '@/design/navigation'
import './index.scss'

type DisplayUser = {
  nickname?: string
  name?: string
  phone?: string
  id?: string
  profile_completion?: number
}

// 从小程序配置获取版本号
const getAppVersion = (): string => {
  try {
    const accountInfo = Taro.getAccountInfoSync?.()
    return accountInfo?.miniProgram?.version || '1.0.0'
  } catch {
    return '1.0.0'
  }
}

export default function ProfilePage() {
  const [userInfo, setUserInfo] = useState<DisplayUser | null>(null)
  const [appVersion] = useState(getAppVersion)
  const [completion, setCompletion] = useState(0)
  const [loading, setLoading] = useState(true)
  const { role, isElder, setRole } = useRole()

  useEffect(() => {
    let mounted = true

    const loadPage = async () => {
      setLoading(true)
      try {
        const profile = await getUserInfo()
        if (!mounted) return

        setUserInfo({
          id: String(profile.id || ''),
          name: profile.name,
          nickname: profile.name,
          phone: profile.phone,
          profile_completion: profile.profile_completion,
        })
        
        // 计算资料完成度 - 基于真实数据
        const fields = [profile.name, profile.phone, profile.id_card, profile.address, profile.emergency_contact]
        const filledCount = fields.filter(Boolean).length
        const calculatedCompletion = Math.round((filledCount / fields.length) * 100)
        setCompletion(profile.profile_completion || calculatedCompletion || 0)
      } catch (error) {
        console.error('Failed to load profile:', error)
        if (!mounted) return

        try {
          const localInfo = Taro.getStorageSync('userInfo')
          if (localInfo) {
            const parsed = JSON.parse(localInfo) as DisplayUser
            setUserInfo(parsed)
            setCompletion(parsed.profile_completion || 0)
          }
        } catch (_storageError) {
          setUserInfo(null)
        }
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

  const sections = profileSectionsByRole[role] || []

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

  const handleRoleSwitch = () => {
    Taro.showModal({
      title: '切换身份模式',
      content: `确认切换到${isElder ? '【家属守护】' : '【长辈关怀】'}模式吗？`,
      success: (res) => {
        if (res.confirm) {
          setRole(isElder ? 'family' : 'elder')
        }
      }
    })
  }

  return (
    <PageShell roleTone={role === 'elder' ? 'elder' : 'family'} className="profile-dashboard min-h-screen bg-yinban-bg pb-10" loading={loading}>
      <HeroHeader
        roleTone={role === 'elder' ? 'elder' : 'family'}
        eyebrow={role === 'elder' ? '身份卡' : '家庭守护身份'}
        title={role === 'elder' ? '我的照护设置' : '我的守护设置'}
        subtitle={role === 'elder' ? '管理您的个人信息与系统设置' : '管理家庭设置与长辈资料'}
      />

      <View className="px-5 -mt-8 relative z-10">
        <View className="bg-white rounded-[24px] shadow-sm p-6 flex items-center mb-6">
          <View className={`w-16 h-16 rounded-full flex items-center justify-center mr-4 ${isElder ? 'bg-yinban-primary' : 'bg-yinban-secondary'}`}>
            <UserIcon size={32} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900 block mb-1">{displayName}</Text>
            <View className="flex items-center text-base text-gray-600">
              <Text className={`px-2 py-0.5 rounded-md mr-2 text-white ${isElder ? 'bg-yinban-primary/80' : 'bg-yinban-secondary/80'}`}>
                {isElder ? '长辈身份' : '家属身份'}
              </Text>
              <Text>{userInfo?.phone || '未绑定手机号'}</Text>
            </View>
          </View>
        </View>

        <View 
          className={`w-full py-4 rounded-[20px] flex items-center justify-center shadow-sm active:scale-[0.98] transition-all mb-8 ${isElder ? 'bg-blue-50 border-2 border-blue-100' : 'bg-orange-50 border-2 border-orange-100'}`}
          onClick={handleRoleSwitch}
        >
          <Icon name="transit" size={24} color={isElder ? '#3B82F6' : '#EA580C'} />
          <Text className={`text-[18px] font-bold ml-3 ${isElder ? 'text-blue-600' : 'text-orange-600'}`}>
            切换至{isElder ? '家属' : '长辈'}模式
          </Text>
        </View>

        {sections.map((section) => (
          <View key={section.key} className="mb-8">
            <Text className="text-lg font-bold text-gray-800 mb-4 px-1 block">{section.title}</Text>
            {isElder ? (
              // Elder Layout: Grid of Large Cards
              <View className="grid grid-cols-1 gap-4">
                {section.items.map((item) => (
                  <View 
                    key={item.key} 
                    className="bg-white p-5 rounded-[20px] shadow-sm flex items-center active:bg-gray-50 transition-colors"
                    onClick={() => navigateByPath(item.path)}
                  >
                    <View className="w-12 h-12 rounded-2xl bg-yinban-primary/10 flex items-center justify-center mr-4">
                      <Icon name={item.icon as IconName} size={28} color="#2f6c5b" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[20px] font-bold text-gray-900 block mb-1">{item.label}</Text>
                      <Text className="text-[16px] text-gray-600">{item.description}</Text>
                    </View>
                    <Icon name="arrow-right" size={24} color="#CBD5E1" />
                  </View>
                ))}
              </View>
            ) : (
              // Family Layout: Compact List
              <View className="bg-white rounded-[20px] shadow-sm overflow-hidden">
                {section.items.map((item, index) => (
                  <View 
                    key={item.key} 
                    className={`flex items-center p-4 active:bg-gray-50 transition-colors ${index !== section.items.length - 1 ? 'border-b border-gray-100' : ''}`}
                    onClick={() => navigateByPath(item.path)}
                  >
                     <View className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mr-4">
                      <Icon name={item.icon as IconName} size={20} color="#EA580C" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[18px] font-medium text-gray-900 block">{item.label}</Text>
                      <Text className="text-[16px] text-gray-500 block mt-0.5">{item.description}</Text>
                    </View>
                    <Icon name="arrow-right" size={16} color="#94A3B8" />
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        <Button 
          className="bg-gray-100 text-gray-500 font-medium py-3 rounded-xl border-none active:bg-gray-200 mb-6"
          onClick={handleLogout}
        >
          退出登录
        </Button>
        <Text className="text-center text-base text-gray-500 block pb-8">银伴前端版本 · v{appVersion}</Text>
      </View>
    </PageShell>
  )
}
