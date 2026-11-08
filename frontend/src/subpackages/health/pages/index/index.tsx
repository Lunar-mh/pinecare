import { useCallback, useEffect, useMemo, useState } from 'react'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { View, Text, ScrollView, Button, Canvas } from '@tarojs/components'
import { Check, Heart, Plus, Refresh, Warning, ArrowUp, Ask } from '@nutui/icons-react-taro'
import {
  ActionGrid,
  DataPanel,
  EmptyState,
  HeroHeader,
  PageShell,
  SectionBlock,
  StatusCard,
  StickyPrimaryAction,
} from '@/components/shell'
import { dismissHealthAlert, getHealthAlerts, getTodayHealthOverview } from '@/services/modules/health'
import type { BloodPressureRecord, HeartRateRecord } from '@/services/types'
import { useRole } from '@/hooks/useRole'
import { Icon } from '@/components/icons'
import './index.scss'

type HealthAlert = {
  id: string
  level: 'warning' | 'danger'
  message: string
  suggestion: string
  createdAt: string
}

export default function HealthIndex() {
  const { isElder } = useRole()
  const [bloodPressure, setBloodPressure] = useState<BloodPressureRecord | null>(null)
  const [heartRate, setHeartRate] = useState<HeartRateRecord | null>(null)
  const [steps, setSteps] = useState(0)
  const [alerts, setAlerts] = useState<HealthAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadHealthData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [overview, alertList] = await Promise.all([getTodayHealthOverview(), getHealthAlerts()])
      setBloodPressure(overview.bloodPressure || null)
      setHeartRate(overview.heartRate || null)
      setSteps(overview.steps || 0)
      setAlerts(alertList || [])
    } catch (loadError) {
      console.error('load health overview failed', loadError)
      setError('数据加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadHealthData() }, [loadHealthData])

  usePullDownRefresh(() => { loadHealthData().finally(() => Taro.stopPullDownRefresh()) })

  const handleDismiss = async (id: string) => {
    try {
      await dismissHealthAlert(id)
      setAlerts(prev => prev.filter(item => item.id !== id))
      Taro.showToast({ title: '已确认', icon: 'success' })
    } catch (e) {
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  const navigateTo = (path: string) => Taro.navigateTo({ url: path })

  // --- ELDER VIEW ---
  const renderElderView = () => (
    <PageShell roleTone="elder" className="bg-yinban-bg min-h-screen">
      <HeroHeader
        roleTone="elder"
        eyebrow="健康档案"
        title="我的身体怎么样？"
        subtitle="这里记录着您每天的血压和心率，医生问起来直接给他看。"
        aside={
           <View className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/30">
             <Heart size={32} color="#fff" />
           </View>
        }
      />

      <ScrollView className="px-5 -mt-6 pb-24" scrollY>
        {/* BIG NUMBERS CARD */}
        <View className="grid grid-cols-2 gap-4 mb-6">
          <View className="bg-white p-5 rounded-[24px] shadow-sm flex flex-col justify-between h-40 active:scale-[0.98] transition-transform" onClick={() => navigateTo('/subpackages/health/pages/blood-pressure/index')}>
             <View className="flex items-center text-gray-500 mb-2">
               <View className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-2"><Icon name="heart" size={16} color="#3B82F6"/></View>
               <Text>血压</Text>
             </View>
             <View>
                <Text className="text-3xl font-bold text-gray-900 block mb-1">
                  {bloodPressure ? `${bloodPressure.systolic}/${bloodPressure.diastolic}` : '--'}
                </Text>
                <Text className="text-xs text-gray-400">
                  {bloodPressure ? new Date(bloodPressure.measuredAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '今日未测'}
                </Text>
             </View>
             <View className="self-end bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">去记录 &gt;</View>
          </View>

          <View className="bg-white p-5 rounded-[24px] shadow-sm flex flex-col justify-between h-40 active:scale-[0.98] transition-transform" onClick={() => navigateTo('/subpackages/health/pages/heart-rate/index')}>
             <View className="flex items-center text-gray-500 mb-2">
               <View className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center mr-2"><Heart size={16} color="#EF4444"/></View>
               <Text>心率</Text>
             </View>
             <View>
                <Text className="text-3xl font-bold text-gray-900 block mb-1">
                  {heartRate ? heartRate.value : '--'} <Text className="text-sm font-normal text-gray-500">bpm</Text>
                </Text>
                <Text className="text-xs text-gray-400">
                  {heartRate ? new Date(heartRate.measuredAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '今日未测'}
                </Text>
             </View>
             <View className="self-end bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold">去记录 &gt;</View>
          </View>
        </View>

        {/* ALERTS */}
        {alerts.length > 0 && (
          <View className="mb-6">
            <Text className="text-lg font-bold text-gray-800 mb-3 px-1 block">医生提醒</Text>
            {alerts.map(alert => (
              <View key={alert.id} className="bg-orange-50 p-5 rounded-[20px] mb-3 border border-orange-100 relative">
                 <Text className="text-lg font-bold text-gray-900 block mb-2">{alert.message}</Text>
                 <Text className="text-gray-600 block mb-4">{alert.suggestion}</Text>
                 <Button className="bg-white text-orange-600 border border-orange-200 font-bold w-full rounded-xl" onClick={() => handleDismiss(alert.id)}>我知道了</Button>
              </View>
            ))}
          </View>
        )}

        {/* VOICE AI TEASER */}
        <View className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-[24px] p-6 shadow-md text-white flex items-center justify-between" onClick={() => navigateTo('/subpackages/voice_ai/pages/index/index')}>
          <View>
            <Text className="text-xl font-bold block mb-1">身体不舒服？</Text>
            <Text className="text-white/80 text-sm">按住说句话，AI 帮您分析</Text>
          </View>
          <View className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Icon name="mic" size={24} color="#fff" />
          </View>
        </View>

      </ScrollView>

      <StickyPrimaryAction
        tone="elder"
        label="记录一下"
        icon={<Plus size={24} />}
        onClick={() => Taro.showActionSheet({
          itemList: ['记录血压', '记录心率'],
          success: (res) => navigateTo(res.tapIndex === 0 ? '/subpackages/health/pages/blood-pressure/index' : '/subpackages/health/pages/heart-rate/index')
        })}
      />
    </PageShell>
  )

  // --- FAMILY VIEW ---
  const renderFamilyView = () => (
    <PageShell roleTone="family" className="bg-gray-50 min-h-screen">
      <View className="bg-white pt-12 px-6 pb-6 rounded-b-[32px] shadow-sm sticky top-0 z-10">
         <View className="flex justify-between items-center mb-2">
           <View>
             <Text className="text-2xl font-bold text-gray-900 block">健康监测</Text>
             <Text className="text-sm text-gray-500">长辈今日身体指标概览</Text>
           </View>
           <View className="bg-green-50 p-2 rounded-full">
             <ArrowUp size={24} color="#10B981" />
           </View>
         </View>
         
         <View className="grid grid-cols-3 gap-4 mt-6">
            <View className="text-center">
               <Text className="text-xs text-gray-400 block mb-1">今日血压</Text>
               <Text className={`text-xl font-bold ${bloodPressure?.status === 'danger' ? 'text-red-600' : 'text-gray-900'}`}>
                 {bloodPressure ? bloodPressure.systolic : '--'}
               </Text>
            </View>
            <View className="text-center border-l border-gray-100">
               <Text className="text-xs text-gray-400 block mb-1">今日心率</Text>
               <Text className={`text-xl font-bold ${heartRate?.status === 'danger' ? 'text-red-600' : 'text-gray-900'}`}>{heartRate ? heartRate.value : '--'}</Text>
            </View>
            <View className="text-center border-l border-gray-100">
               <Text className="text-xs text-gray-400 block mb-1">异常提醒</Text>
               <Text className={`text-xl font-bold ${alerts.length > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{alerts.length}</Text>
            </View>
         </View>
      </View>

      <ScrollView className="px-5 py-6" scrollY>
         {/* Detailed List */}
         <View className="bg-white rounded-[20px] p-5 shadow-sm mb-6">
            <View className="flex justify-between items-center mb-4">
              <Text className="text-lg font-bold text-gray-800">详细数据</Text>
              <Text className="text-sm text-blue-600 font-bold" onClick={() => navigateTo('/subpackages/health/pages/records/index')}>查看历史 &gt;</Text>
            </View>
            
            {!bloodPressure && !heartRate && <View className="py-8 text-center text-gray-400">今日暂无数据</View>}

            {bloodPressure && (
              <View className="flex items-center py-4 border-b border-gray-50">
                <View className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mr-4">
                  <Icon name="heart" size={20} color="#3B82F6" />
                </View>
                <View className="flex-1">
                   <Text className="text-base font-bold text-gray-900">血压记录</Text>
                   <Text className="text-xs text-gray-400">{new Date(bloodPressure.measuredAt).toLocaleString()}</Text>
                </View>
                <Text className="text-xl font-bold text-gray-800">{bloodPressure.systolic}/{bloodPressure.diastolic}</Text>
              </View>
            )}

            {heartRate && (
              <View className="flex items-center py-4">
                <View className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mr-4">
                  <Heart size={20} color="#EF4444" />
                </View>
                <View className="flex-1">
                   <Text className="text-base font-bold text-gray-900">心率记录</Text>
                   <Text className="text-xs text-gray-400">{new Date(heartRate.measuredAt).toLocaleString()}</Text>
                </View>
                <Text className="text-xl font-bold text-gray-800">{heartRate.value} <Text className="text-sm text-gray-400 font-normal">bpm</Text></Text>
              </View>
            )}
         </View>
         
         {/* Voice AI Entry */}
         <View className="bg-emerald-50 rounded-[20px] p-5 flex items-center" onClick={() => navigateTo('/subpackages/voice_ai/pages/index/index')}>
            <View className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mr-4">
               <Ask size={24} color="#059669" />
            </View>
            <View className="flex-1">
               <Text className="text-lg font-bold text-emerald-900 block">语音健康助手</Text>
               <Text className="text-sm text-emerald-700">说句话即可查询健康指标与防护建议</Text>
            </View>
            <Icon name="arrow-right" size={16} color="#059669" />
         </View>

      </ScrollView>
    </PageShell>
  )

  return isElder ? renderElderView() : renderFamilyView()
}

