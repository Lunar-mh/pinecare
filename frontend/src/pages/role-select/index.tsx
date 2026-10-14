import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Icon, UserIcon, FamilyIcon } from '@/components/icons'

export default function RoleSelectPage() {
  const handleRoleSelect = (role: 'elder' | 'family') => {
    Taro.setStorageSync('userRole', role)
    Taro.setStorageSync('roleSelectTime', Date.now())
    const url = role === 'elder' ? '/pages/index/index' : '/pages/dashboard/index'
    Taro.reLaunch({ url })
  }

  return (
    <View className="min-h-screen bg-yinban-bg flex flex-col pt-12 px-6">

      <View className="mb-10 mt-10">
        <Text className="block text-[32px] font-bold text-dash-text-main mb-3">
          选择您的身份
        </Text>
        <Text className="block text-[18px] text-dash-text-sub">
          我们将为您匹配最适合的界面和功能。后续可在“我的”页面随时切换。
        </Text>
      </View>

      <View className="flex flex-col space-y-6">
        <View
          className="bg-white rounded-[24px] shadow-lg p-8 flex items-center border-4 border-transparent active:border-yinban-primary active:scale-[0.98] transition-all"
          onClick={() => handleRoleSelect('elder')}
        >
          <View className="w-20 h-20 bg-yinban-primary/10 rounded-[28px] flex items-center justify-center mr-6 shrink-0">
            <UserIcon size={44} color="#10B981" />
          </View>
          <View className="flex-1">
            <Text className="block text-[28px] font-bold text-dash-text-main mb-2">我是长辈</Text>
            <Text className="block text-[18px] text-dash-text-sub leading-relaxed">
              超大字体、语音助手、一键呼救。界面极其简单，专为长辈设计。
            </Text>
          </View>
          <View className="ml-2">
            <Icon name="chevron-right" size={32} color="#CBD5E1" />
          </View>
        </View>

        <View
          className="bg-white rounded-[24px] shadow-lg p-8 flex items-center border-4 border-transparent active:border-yinban-secondary active:scale-[0.98] transition-all"
          onClick={() => handleRoleSelect('family')}
        >
          <View className="w-20 h-20 bg-yinban-secondary/10 rounded-[28px] flex items-center justify-center mr-6 shrink-0">
            <FamilyIcon size={44} color="#3B82F6" />
          </View>
          <View className="flex-1">
            <Text className="block text-[24px] font-bold text-dash-text-main mb-2">我是家属</Text>
            <Text className="block text-[15px] text-dash-text-sub leading-relaxed">
              远程安全监控、健康数据追踪、服药计划管理。随时掌握父母动态。
            </Text>
          </View>
          <View className="ml-2">
            <Icon name="chevron-right" size={28} color="#CBD5E1" />
          </View>
        </View>
      </View>

      <View className="mt-auto pb-12 flex flex-col items-center justify-center">
        <View className="flex items-center space-x-2 text-dash-text-sub opacity-60">
          <Icon name="shield-check" size={20} color="#64748B" />
          <Text className="text-[16px] font-medium">银伴社区安全体系认证</Text>
        </View>
      </View>
    </View>
  )
}
