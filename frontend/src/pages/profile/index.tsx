import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { useRole } from '@/hooks/useRole'
import { UserIcon, ChevronRightIcon, SettingsIcon, PhoneIcon, AlertIcon, InfoIcon } from '@/components/icons'
import './index.scss'

export default function Profile() {
  const [userInfo, setUserInfo] = useState<{ phone?: string; nickname?: string; id?: string } | null>(null)
  const { role, setRole } = useRole()

  useEffect(() => {
    try {
      const info = Taro.getStorageSync('userInfo')
      if (info) {
        setUserInfo(JSON.parse(info))
      }
    } catch (e: unknown) {}
  }, [])

  const handleRoleSwitch = (newRole: 'elder' | 'family') => {
    setRole(newRole)
    Taro.showToast({ title: '已切换', icon: 'success' })
    // 强制刷新 TabBar 首页以应用新角色
    setTimeout(() => {
      Taro.switchTab({ url: '/pages/index/index' })
    }, 300)
  }

  const handleLogout = () => {
    Taro.clearStorageSync()
    Taro.reLaunch({ url: '/pages/login/index' })
  }


  const displayName = userInfo?.nickname || userInfo?.phone || '用户'
  const showPhone = userInfo?.nickname && userInfo?.phone

  return (
    <View className="profile-page">
      <View className="profile-role-toggle">
        <View 
          className={`profile-role-btn ${role === 'elder' ? 'profile-role-btn--elder-active' : 'profile-role-btn--inactive'}`}
          onClick={() => handleRoleSwitch('elder')}
        >
          <Text>长辈模式</Text>
        </View>
        <View 
          className={`profile-role-btn ${role === 'family' ? 'profile-role-btn--family-active' : 'profile-role-btn--inactive'}`}
          onClick={() => handleRoleSwitch('family')}
        >
          <Text>家属模式</Text>
        </View>
      </View>

      <View className="profile-avatar-section">
        <View className="profile-avatar">
          <UserIcon size={48} className="profile-avatar-icon" />
        </View>
        <Text className="profile-name">{displayName}</Text>
        {showPhone && <Text className="profile-phone">{userInfo?.phone}</Text>}
      </View>

      <View className="profile-menu">
        <View className="profile-menu-item" onClick={() => Taro.navigateTo({ url: '/subpackages/settings/pages/index/index' })}>
          <View className="profile-menu-icon">
            <SettingsIcon size={24} />
          </View>
          <Text className="profile-menu-text">系统设置</Text>
          <ChevronRightIcon size={20} className="profile-menu-arrow" />
        </View>
        <View className="profile-menu-item" onClick={() => Taro.navigateTo({ url: '/subpackages/settings/pages/device/index' })}>
          <View className="profile-menu-icon">
            <PhoneIcon size={24} />
          </View>
          <Text className="profile-menu-text">设备绑定</Text>
          <ChevronRightIcon size={20} className="profile-menu-arrow" />
        </View>
        <View className="profile-menu-item" onClick={() => Taro.navigateTo({ url: '/subpackages/settings/pages/emergency/index' })}>
          <View className="profile-menu-icon">
            <AlertIcon size={24} />
          </View>
          <Text className="profile-menu-text">紧急联系人</Text>
          <ChevronRightIcon size={20} className="profile-menu-arrow" />
        </View>
        <View className="profile-menu-item" onClick={() => Taro.navigateTo({ url: '/subpackages/settings/pages/feedback/index' })}>
          <View className="profile-menu-icon">
            <InfoIcon size={24} />
          </View>
          <Text className="profile-menu-text">帮助与反馈</Text>
          <ChevronRightIcon size={20} className="profile-menu-arrow" />
        </View>
        <View className="profile-menu-item" onClick={() => Taro.navigateTo({ url: '/subpackages/settings/pages/about/index' })}>
          <View className="profile-menu-icon">
            <InfoIcon size={24} />
          </View>
          <Text className="profile-menu-text">关于银伴</Text>
          <ChevronRightIcon size={20} className="profile-menu-arrow" />
        </View>
      </View>

      <Button className="profile-logout" onClick={handleLogout}>退出登录</Button>

      <View className="profile-version">
        <Text>v1.0.0</Text>
      </View>
    </View>
  )
}
