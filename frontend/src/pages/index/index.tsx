import { View, Text, Image } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import React, { useState } from 'react'
import { Icon } from '@/components/icons'
import { PageShell } from '@/components/shell'
import { useRole } from '@/hooks/useRole'
import FamilyDashboard from './FamilyDashboard'

export default function IndexPage() {
  const { isFamily } = useRole()
  const [loading, setLoading] = useState(false)

  // 1. 如果是家属模式，走独立的大盘视图
  if (isFamily) return <FamilyDashboard />

  // 2. 长辈模式：Bento Box 便当盒极简布局 (Tailwind)
  const handleSos = () => Taro.navigateTo({ url: '/subpackages/sos/pages/index/index' })
  const handleVoice = () => Taro.navigateTo({ url: '/subpackages/voice_ai/pages/index/index' })
  const handleMedication = () => Taro.navigateTo({ url: '/subpackages/medication/pages/index/index' })
  const handleAlbum = () => Taro.navigateTo({ url: '/subpackages/family_space/pages/index/index' })

  return (
    <PageShell roleTone="elder" className="bg-yinban-bg min-h-screen pb-10" loading={loading}>
      {/* 顶部问候区域 */}
      <View className="px-6 pt-8 pb-6">
        <Text className="block text-elder-title font-bold text-bento-text-main mb-2">
          早上好，长辈
        </Text>
        <Text className="block text-elder-body text-bento-text-sub">
          今天天气晴朗，记得按时吃药。
        </Text>
      </View>

      {/* 核心功能：Bento Box 网格布局 */}
      <View className="px-4 grid grid-cols-bento auto-rows-bento gap-4">
        
        {/* SOS 一键求救 (跨两列，极其醒目) */}
        <View 
          className="col-span-2 row-span-2 bg-bento-danger rounded-bento shadow-bento flex flex-col items-center justify-center active:scale-95 transition-transform"
          onClick={handleSos}
        >
          <View className="bg-white/20 p-6 rounded-full mb-4">
            <Icon name="sos" size={80} color="#FFFFFF" />
          </View>
          <Text className="text-elder-hero font-extrabold text-white tracking-widest">一键呼救</Text>
          <Text className="text-elder-body text-white/80 mt-2">紧急情况请按此</Text>
        </View>

        {/* 语音助手 (大色块) */}
        <View 
          className="col-span-1 row-span-2 bg-yinban-primary rounded-bento shadow-bento p-6 flex flex-col justify-between active:scale-95 transition-transform"
          onClick={handleVoice}
        >
          <View className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center">
            <Icon name="mic" size={48} color="#FFFFFF" />
          </View>
          <View>
            <Text className="block text-elder-title font-bold text-white mb-1">语音</Text>
            <Text className="block text-elder-title font-bold text-white">帮手</Text>
          </View>
        </View>

        {/* 服药提醒 */}
        <View 
          className="col-span-1 row-span-1 bg-bento-warning rounded-bento shadow-bento p-5 flex flex-col justify-between active:scale-95 transition-transform"
          onClick={handleMedication}
        >
          <View className="flex justify-between items-start">
            <Icon name="medication" size={40} color="#FFFFFF" />
            <View className="bg-white text-bento-warning px-3 py-1 rounded-full text-dash-tiny font-bold">
              待吃
            </View>
          </View>
          <Text className="text-elder-body font-bold text-white mt-4">吃药提醒</Text>
        </View>

        {/* 家庭相册 */}
        <View 
          className="col-span-1 row-span-1 bg-yinban-secondary rounded-bento shadow-bento p-5 flex flex-col justify-between active:scale-95 transition-transform"
          onClick={handleAlbum}
        >
          <Icon name="gallery" size={40} color="#FFFFFF" />
          <Text className="text-elder-body font-bold text-white mt-4">看孙子</Text>
        </View>

      </View>
      
      {/* 底部附加信息 (占位，避免页面太空) */}
      <View className="mt-8 px-6 flex justify-center">
        <Text className="text-dash-body text-bento-text-sub flex items-center">
          <Icon name="shield-check" size={20} color="#666" />
          <Text className="ml-2">银伴社区实时守护中</Text>
        </Text>
      </View>

    </PageShell>
  )
}
