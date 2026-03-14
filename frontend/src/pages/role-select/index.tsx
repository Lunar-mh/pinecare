import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { PageShell } from '@/components/shell'
import './index.scss'

export default function RoleSelectPage() {
  const handleRoleSelect = (role: 'elder' | 'family') => {
    Taro.setStorageSync('userRole', role)
    // Go to dashboard
    Taro.reLaunch({ url: '/pages/index/index' })
  }

  return (
    <View className="role-select-page">
      <PageShell>
        <View className="role-select-header">
          <Text className="title">请选择您的身份</Text>
          <Text className="subtitle">银伴将为您提供专属的界面与服务</Text>
        </View>

        <View className="role-card-container">
          <View className="role-card elder-card" onClick={() => handleRoleSelect('elder')}>
            <View className="role-icon">👵</View>
            <View className="role-info">
              <Text className="role-name">我是长者</Text>
              <Text className="role-desc">大字版、语音交互、健康监测</Text>
            </View>
          </View>

          <View className="role-card family-card" onClick={() => handleRoleSelect('family')}>
            <View className="role-icon">👨‍👩‍👧</View>
            <View className="role-info">
              <Text className="role-name">我是家属</Text>
              <Text className="role-desc">代办设置、位置关注、数据报告</Text>
            </View>
          </View>
        </View>
      </PageShell>
    </View>
  )
}
