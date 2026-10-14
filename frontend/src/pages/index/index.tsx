/**
 * 长辈端首页 - Bento Box 极简布局
 * 适老化设计：超大触控热区、高对比度、语音优先
 */
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import React, { useState, useCallback } from 'react'
import { Icon } from '@/components/icons'
import { PageShell } from '@/components/shell'
import { getTodayMedications } from '@/services/modules/medication'
import { getUnreadMessageCount } from '@/services/modules/family'
import { getUserInfo } from '@/services/modules/user'

// 获取时间段问候语
const getGreeting = (): string => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  if (hour < 22) return '晚上好'
  return '夜深了'
}

// 获取今日日期
const getTodayDate = (): string => {
  const now = new Date()
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const month = now.getMonth() + 1
  const date = now.getDate()
  const weekDay = weekDays[now.getDay()]
  return `${month}月${date}日 ${weekDay}`
}

export default function ElderHome() {
  const [userName, setUserName] = useState('')
  const [pendingMeds, setPendingMeds] = useState(0)
  const [newMessages, setNewMessages] = useState(0)
  const [loading, setLoading] = useState(true)

  // 加载实时数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [userInfo, medsData, messagesData] = await Promise.all([
        getUserInfo().catch(() => null),
        getTodayMedications().catch(() => []),
        getUnreadMessageCount().catch(() => ({ count: 0 })),
      ])
      
      // 设置用户名（优先显示昵称，其次真名，最后默认"您"）
      const displayName = userInfo?.nickname || userInfo?.real_name || '您'
      setUserName(displayName)
      
      // 计算待服药次数
      const pendingCount = medsData.filter(m => m.status === 'pending').length
      setPendingMeds(pendingCount)
      setNewMessages(messagesData.count || 0)
    } catch (error) {
      console.error('Failed to load home data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useDidShow(() => {
    loadData()
  })

  // 导航处理
  const handleSos = () => Taro.navigateTo({ url: '/subpackages/sos/pages/index/index' })
  const handleVoice = () => Taro.navigateTo({ url: '/subpackages/voice_ai/pages/index/index' })
  const handleMedication = () => Taro.navigateTo({ url: '/subpackages/medication/pages/index/index' })
  const handleFamilySpace = () => Taro.navigateTo({ url: '/subpackages/family_space/pages/index/index' })
  const handleHealth = () => Taro.navigateTo({ url: '/subpackages/health/pages/index/index' })
  const handleServices = () => Taro.navigateTo({ url: '/pages/services/index' })

  return (
    <PageShell roleTone="elder" className="bg-elder-canvas min-h-screen" loading={loading}>
      {/* ========== 顶部问候区域 ========== */}
      <View className="px-page-elder pt-8 pb-6">
        <View className="flex items-center justify-between mb-2">
          <Text className="text-elder-title text-elder-text-primary">
            {getGreeting()}，{userName || '您'}
          </Text>
          {/* 通知入口 */}
          <View
            className="w-12 h-12 bg-elder-surface rounded-full flex items-center justify-center shadow-card active:scale-95 transition-transform"
            onClick={() => Taro.navigateTo({ url: '/subpackages/settings/pages/index/index' })}
          >
            <Icon name="bell" size={28} color="#4A4A4A" />
          </View>
        </View>
        <Text className="text-elder-body text-elder-text-secondary">
          {getTodayDate()}
        </Text>
      </View>

      {/* ========== 核心功能 Bento 网格 ========== */}
      <View className="px-page-elder">
        <View className="grid grid-cols-bento gap-4">

          {/* ===== SOS 一键呼救 (2x2) ===== */}
          <View
            className="col-span-2 row-span-2 bg-elder-danger rounded-bento shadow-bento overflow-hidden active:scale-[0.97] transition-all duration-base"
            onClick={handleSos}
          >
            <View className="h-full flex flex-col items-center justify-center p-6 bg-elder-danger">
              {/* 脉冲动画圆环 */}
              <View className="relative mb-6">
                <View className="absolute inset-0 bg-white/20 rounded-full animate-pulse-soft" style={{ margin: '-8px' }} />
                <View className="w-24 h-24 bg-white/25 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Icon name="sos" size={64} color="#FFFFFF" />
                </View>
              </View>
              <Text className="text-elder-hero text-white font-bold tracking-wider">
                一键呼救
              </Text>
              <Text className="text-elder-body text-white/90 mt-2">
                紧急情况请按此
              </Text>
            </View>
          </View>

          {/* ===== 语音助手 (1x2) ===== */}
          <View
            className="col-span-1 row-span-2 bg-elder-primary rounded-bento shadow-bento overflow-hidden active:scale-[0.97] transition-all duration-base"
            onClick={handleVoice}
          >
            <View className="h-full flex flex-col justify-between p-5 bg-gradient-to-br from-elder-primary to-elder-primary-strong">
              <View className="w-16 h-16 bg-white/25 rounded-2xl flex items-center justify-center">
                <Icon name="mic" size={40} color="#FFFFFF" />
              </View>
              <View>
                <Text className="block text-elder-subtitle text-white font-bold">语音</Text>
                <Text className="block text-elder-subtitle text-white font-bold">帮手</Text>
                <Text className="block text-elder-caption text-white/80 mt-2">
                  说一句话就能操作
                </Text>
              </View>
            </View>
          </View>

          {/* ===== 吃药提醒 (1x1) ===== */}
          <View
            className="col-span-1 row-span-1 bg-elder-warning rounded-bento shadow-bento overflow-hidden active:scale-[0.97] transition-all duration-base min-h-touch-elder"
            onClick={handleMedication}
          >
            <View className="h-full flex flex-col justify-between p-5">
              <View className="flex justify-between items-start">
                <Icon name="medication" size={36} color="#FFFFFF" />
                {pendingMeds > 0 && (
                  <View className="bg-white px-3 py-1 rounded-full">
                    <Text className="text-family-caption font-bold text-elder-warning">
                      {pendingMeds}次待吃
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-elder-body font-bold text-white">
                吃药提醒
              </Text>
            </View>
          </View>

          {/* ===== 家庭相册 (1x1) ===== */}
          <View
            className="col-span-1 row-span-1 bg-family-primary rounded-bento shadow-bento overflow-hidden active:scale-[0.97] transition-all duration-base min-h-touch-elder"
            onClick={handleFamilySpace}
          >
            <View className="h-full flex flex-col justify-between p-5">
              <View className="flex justify-between items-start">
                <Icon name="gallery" size={36} color="#FFFFFF" />
                {newMessages > 0 && (
                  <View className="bg-white px-3 py-1 rounded-full">
                    <Text className="text-family-caption font-bold text-family-primary">
                      {newMessages}条新
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-elder-body font-bold text-white">
                看孙子
              </Text>
            </View>
          </View>

        </View>
      </View>

      {/* ========== 健康快捷入口 ========== */}
      <View className="px-page-elder mt-6">
        <View
          className="bg-elder-surface rounded-bento-sm shadow-card p-5 flex items-center justify-between active:scale-[0.98] transition-all duration-base"
          onClick={handleHealth}
        >
          <View className="flex items-center">
            <View className="w-14 h-14 bg-elder-primary-soft rounded-2xl flex items-center justify-center mr-4">
              <Icon name="heart" size={32} color="#2F8C6B" />
            </View>
            <View>
              <Text className="block text-elder-body font-bold text-elder-text-primary">
                健康档案
              </Text>
              <Text className="block text-elder-caption text-elder-text-secondary mt-1">
                血压、心率记录
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={28} color="#6B6B6B" />
        </View>
      </View>

      {/* ========== 更多服务入口 ========== */}
      <View className="px-page-elder mt-4">
        <View
          className="bg-elder-surface rounded-bento-sm shadow-card p-5 flex items-center justify-between active:scale-[0.98] transition-all duration-base"
          onClick={handleServices}
        >
          <View className="flex items-center">
            <View className="w-14 h-14 bg-elder-info-soft rounded-2xl flex items-center justify-center mr-4">
              <Icon name="grid" size={32} color="#1565C0" />
            </View>
            <View>
              <Text className="block text-elder-body font-bold text-elder-text-primary">
                更多服务
              </Text>
              <Text className="block text-elder-caption text-elder-text-secondary mt-1">
                AI问诊、挂号等
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={28} color="#6B6B6B" />
        </View>
      </View>

      {/* ========== 底部状态栏 ========== */}
      <View className="mt-8 px-page-elder pb-8">
        <View className="flex items-center justify-center py-4">
          <View className="w-3 h-3 bg-elder-success rounded-full mr-3 animate-pulse-soft" />
          <Text className="text-elder-caption text-elder-text-muted">
            银伴社区实时守护中
          </Text>
        </View>
      </View>

      {/* ========== 语音助手悬浮按钮 ========== */}
      <View
        className="fixed right-5 bottom-28 w-16 h-16 bg-elder-primary rounded-full shadow-fab flex items-center justify-center active:scale-90 transition-all duration-fast z-50"
        onClick={handleVoice}
      >
        <Icon name="mic" size={32} color="#FFFFFF" />
      </View>
    </PageShell>
  )
}
