import { useCallback, useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'
import { getElderlyOverview } from '@/services/modules/family'
import type { ElderlyOverview } from '@/services/types'
import { Icon, UserIcon } from '@/components/icons'
import { PageShell } from '@/components/shell'
import { homeQuickActionsByRole } from '@/design/navigation'
import { buildFamilySummaryCards } from '@/view-models/dashboard'

export default function FamilyDashboard() {
  const [overview, setOverview] = useState<ElderlyOverview | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const data = await getElderlyOverview()
      setOverview(data)
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [])

  useLoad(() => { loadData() })
  useDidShow(() => { if (overview) loadData(true) })

  const summaryCards = useMemo(() => buildFamilySummaryCards(overview), [overview])
  const quickActions = homeQuickActionsByRole.family

  return (
    <PageShell roleTone="family" className="bg-yinban-bg min-h-screen pb-10" loading={loading}>
      {/* 顶部深色 Header (科技感/医疗感) */}
      <View className="bg-yinban-secondary pt-8 pb-12 px-6 rounded-b-dash shadow-dash relative">
        <View className="flex justify-between items-center">
          <View>
            <Text className="block text-dash-hero font-bold text-white mb-1">照护大盘</Text>
            <Text className="block text-dash-body text-white/80">随时掌握父母健康与安全</Text>
          </View>
          <View 
            className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center active:scale-95 transition-transform" 
            onClick={() => Taro.navigateTo({ url: '/pages/profile/index' })}
          >
            <UserIcon size={32} color="#ffffff" />
          </View>
        </View>
      </View>

      {/* 核心状态卡片 (悬浮于 Header 之上) */}
      <View className="px-4 -mt-6">
        <View className="bg-dash-card rounded-dash shadow-dash p-5 flex justify-between items-center">
          <View className="text-center flex-1 border-r border-dash-border">
            <Text className="block text-dash-title font-bold text-dash-text-main">
              {overview?.todayHealth.medicationProgress || 0}%
            </Text>
            <Text className="block text-dash-tiny text-dash-text-sub mt-1">今日用药</Text>
          </View>
          <View className="text-center flex-1 border-r border-dash-border">
            <Text className="block text-dash-title font-bold text-yinban-primary">85分</Text>
            <Text className="block text-dash-tiny text-dash-text-sub mt-1">健康评分</Text>
          </View>
          <View className="text-center flex-1">
            <Text className="block text-dash-title font-bold text-yinban-primary">正常</Text>
            <Text className="block text-dash-tiny text-dash-text-sub mt-1">设备状态</Text>
          </View>
        </View>
      </View>

      {/* 实时位置 Widget */}
      <View className="px-4 mt-6">
        <Text className="block text-dash-title font-bold text-dash-text-main mb-3 ml-1">实时安全</Text>
        <View 
          className="bg-dash-card rounded-dash shadow-dash p-5 active:scale-[0.98] transition-transform"
          onClick={() => Taro.navigateTo({ url: '/subpackages/location/pages/index/index' })}
        >
          <View className="flex items-start">
            <View className="bg-blue-50 p-3 rounded-full mr-4">
              <Icon name="location" size={28} color="#3B82F6" />
            </View>
            <View className="flex-1">
              <Text className="block text-dash-body font-bold text-dash-text-main line-clamp-1">
                {overview?.location?.address || '上海市浦东新区张江高科技园区'}
              </Text>
              <View className="flex justify-between items-center mt-2">
                <Text className="text-dash-tiny text-dash-text-sub">更新于 {overview?.location?.updatedAt || '刚刚'}</Text>
                <Text className="text-dash-tiny font-bold text-yinban-secondary">查看地图 &gt;</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* 体征指标 Widget Grid */}
      <View className="px-4 mt-6">
        <Text className="block text-dash-title font-bold text-dash-text-main mb-3 ml-1">健康数据</Text>
        <View className="grid grid-cols-2 gap-4">
          {summaryCards.map(({ key, title, value, unit, hint }) => (
            <View key={key} className="bg-dash-card rounded-dash shadow-dash p-4">
              <Text className="block text-dash-body font-medium text-dash-text-sub mb-2">{title}</Text>
              <View className="flex items-baseline">
                <Text className="text-dash-title font-bold text-dash-text-main mr-1">{value}</Text>
                <Text className="text-dash-tiny text-dash-text-sub">{unit}</Text>
              </View>
              <Text className="block text-dash-tiny text-yinban-primary mt-2">{hint}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 远程管理功能 */}
      <View className="px-4 mt-6">
        <Text className="block text-dash-title font-bold text-dash-text-main mb-3 ml-1">远程管理</Text>
        <View className="grid grid-cols-4 gap-4 bg-dash-card rounded-dash shadow-dash p-4">
          {quickActions.map(item => (
            <View 
              key={item.key} 
              className="flex flex-col items-center active:opacity-50"
              onClick={() => Taro.navigateTo({ url: item.path })}
            >
              <View className="bg-gray-50 p-3 rounded-xl mb-2">
                <Icon name={item.icon} size={28} color="#64748B" />
              </View>
              <Text className="text-dash-tiny text-dash-text-main">{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

    </PageShell>
  )
}
