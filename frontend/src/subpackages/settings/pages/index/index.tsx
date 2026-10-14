import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView, Button } from '@tarojs/components'
import { Check, Setting, User } from '@nutui/icons-react-taro'
import { HeroHeader, PageShell, SectionBlock, ActionGrid } from '@/components/shell'
import { getUserPageConfig } from '@/services'
import { useRole } from '@/hooks/useRole'
import './index.scss'

export default function SettingsIndex() {
  const { isElder } = useRole()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In a real app, fetch config. Here we mock or use static.
    // For now, let's just use static lists based on role
    setLoading(false)
  }, [])

  const handleLogout = () => {
    Taro.clearStorageSync()
    Taro.reLaunch({ url: '/pages/login/index' })
  }

  const handleSwitchRole = () => {
    Taro.navigateTo({ url: '/pages/role-select/index' })
  }

  // --- ELDER VIEW ---
  const renderElderView = () => (
    <PageShell roleTone="elder" className="bg-yinban-bg min-h-screen">
       <HeroHeader 
          roleTone="elder" 
          eyebrow="设置" 
          title="我的设置" 
          subtitle="字体大小、声音大小调整。" 
       />
       <ScrollView className="flex-1 px-4 -mt-4" scrollY>
          <View className="bg-white rounded-[24px] p-6 shadow-sm mb-4 flex items-center justify-between active:bg-gray-50">
             <View className="flex items-center">
                <View className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                   <Text className="text-xl font-bold text-blue-600">A</Text>
                </View>
                <Text className="text-xl font-bold text-gray-900">字体大小</Text>
             </View>
             <Text className="text-gray-400 text-lg">标准 &gt;</Text>
          </View>
          
          <View className="bg-white rounded-[24px] p-6 shadow-sm mb-8 flex items-center justify-between active:bg-gray-50" onClick={handleLogout}>
             <View className="flex items-center">
                <View className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                   <User size={24} className="text-red-600" />
                </View>
                <Text className="text-xl font-bold text-gray-900">退出登录</Text>
             </View>
          </View>
       </ScrollView>
    </PageShell>
  )

  // --- FAMILY VIEW ---
  const renderFamilyView = () => (
    <PageShell roleTone="family" className="bg-gray-50 min-h-screen">
       <HeroHeader 
          roleTone="family" 
          eyebrow="设置中心" 
          title="系统设置" 
          subtitle="管理账号、设备与通知偏好。" 
       />
       <ScrollView className="px-4 -mt-4" scrollY>
          <View className="bg-white rounded-xl overflow-hidden shadow-sm mb-6">
             {[
                { title: '账号安全', icon: <User size={18} /> },
                { title: '通知设置', icon: <Setting size={18} /> },
                { title: '关于我们', icon: <Check size={18} /> },
             ].map((item, idx) => (
                <View key={item.title} className="p-4 flex items-center justify-between border-b border-gray-100 last:border-0 active:bg-gray-50">
                   <View className="flex items-center">
                      <Text className="text-base font-medium text-gray-900 ml-2">{item.title}</Text>
                   </View>
                   <Text className="text-gray-300">&gt;</Text>
                </View>
             ))}
          </View>

          <Button className="bg-white text-red-600 border border-red-100 w-full py-3 rounded-xl font-bold mb-4" onClick={handleLogout}>退出登录</Button>
          <Button className="bg-gray-100 text-gray-600 border-none w-full py-3 rounded-xl font-bold" onClick={handleSwitchRole}>切换角色 (测试用)</Button>
       </ScrollView>
    </PageShell>
  )

  return isElder ? renderElderView() : renderFamilyView()
}
