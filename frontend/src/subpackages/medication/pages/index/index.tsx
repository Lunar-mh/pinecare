import { useCallback, useEffect, useMemo, useState } from 'react'
import Taro, { usePullDownRefresh, useDidShow } from '@tarojs/taro'
import { View, Text, ScrollView, Button } from '@tarojs/components'
import { Check, Clock, List, Warning, ArrowRight, More, Plus, Trash } from '@nutui/icons-react-taro'
import { DataPanel, EmptyState, HeroHeader, PageShell, SectionBlock, StatusCard, StickyPrimaryAction } from '@/components/shell'
import { getMedications, getTodayMedications, markMedicationTaken, skipMedication } from '@/services/modules/medication'
import type { Medication, TodayMedication } from '@/services/types'
import { useRole } from '@/hooks/useRole'
import './index.scss'

type MedicationTab = 'today' | 'plan'

export default function MedicationIndex() {
  const { isElder } = useRole()
  const [todayMeds, setTodayMeds] = useState<TodayMedication[]>([])
  const [plans, setPlans] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [today, medicationPlans] = await Promise.all([getTodayMedications(), getMedications()])
      setTodayMeds(today || [])
      setPlans(medicationPlans || [])
    } catch (loadError) {
      console.error('load medication page failed', loadError)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [])

  useDidShow(() => {
    loadData()
  })

  usePullDownRefresh(() => {
    loadData().finally(() => Taro.stopPullDownRefresh())
  })

  // Data processing
  const pendingMeds = todayMeds.filter(item => item.status === 'pending')
  const takenMeds = todayMeds.filter(item => item.status === 'taken')
  const missedMeds = todayMeds.filter(item => item.status === 'missed')
  const activePlans = plans.filter(item => item.isActive)

  const progress = useMemo(() => {
    if (todayMeds.length === 0) return 0
    return Math.round((takenMeds.length / todayMeds.length) * 100)
  }, [takenMeds.length, todayMeds.length])

  // Actions
  const handleTake = async (item: TodayMedication) => {
    if (!item.logId) return
    try {
      await markMedicationTaken(item.logId)
      Taro.showToast({ title: '✅ 已记录', icon: 'none' })
      loadData()
    } catch (takeError) {
      Taro.showToast({ title: '记录失败', icon: 'none' })
    }
  }

  const handleSkip = async (item: TodayMedication) => {
    if (!item.logId) return
    try {
      await skipMedication(item.logId, '手动跳过')
      Taro.showToast({ title: '已跳过', icon: 'none' })
      loadData()
    } catch (e) {
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  // --- ELDER VIEW ---
  const renderElderView = () => (
    <PageShell roleTone="elder" className="bg-yinban-bg min-h-screen pb-24">
      <HeroHeader
        roleTone="elder"
        eyebrow="我的药盒"
        title="今天的服药任务"
        subtitle={pendingMeds.length > 0 ? `还有 ${pendingMeds.length} 次药没吃` : '今天的药都吃完啦！'}
        aside={
          <View className="w-[86px] h-[86px] rounded-full flex items-center justify-center bg-white/20 border-2 border-white/30 backdrop-blur-sm">
             <View className="text-center">
                <Text className="text-white text-2xl font-bold block leading-none">{progress}%</Text>
                <Text className="text-white/80 text-xs block mt-1">进度</Text>
             </View>
          </View>
        }
      />

      <ScrollView className="flex-1 -mt-6 px-4" scrollY>
        {/* Urgent/Pending items */}
        {pendingMeds.length > 0 && (
          <View className="mb-8">
            <Text className="text-xl font-bold text-gray-800 mb-4 block px-1">现在该吃</Text>
            {pendingMeds.map(item => (
              <View key={`${item.medicationId}-${item.time}`} className="bg-white rounded-[24px] p-6 shadow-sm mb-4 border-l-8 border-l-yinban-primary relative overflow-hidden">
                <View className="flex justify-between items-start mb-4">
                   <View>
                      <Text className="text-2xl font-bold text-gray-900 mb-1 block">{item.name}</Text>
                      <Text className="text-lg text-gray-500">剂量: <Text className="text-yinban-primary font-bold">{item.dosage}</Text></Text>
                   </View>
                   <View className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg font-bold text-lg">
                      {item.time}
                   </View>
                </View>
                
                <Button 
                  className="w-full bg-yinban-primary text-white text-xl font-bold py-4 rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center shadow-lg shadow-blue-200"
                  onClick={() => handleTake(item)}
                >
                  <Check size={24} className="mr-2" /> 我吃完了
                </Button>
              </View>
            ))}
          </View>
        )}

        {/* Missed Items */}
        {missedMeds.length > 0 && (
          <View className="mb-8">
            <Text className="text-xl font-bold text-red-600 mb-4 block px-1 flex items-center"><Warning size={20} className="mr-2"/> 好像超时了</Text>
            {missedMeds.map(item => (
              <View key={item.logId} className="bg-red-50 rounded-[20px] p-5 mb-3 border border-red-100 flex justify-between items-center">
                <View>
                   <Text className="text-lg font-bold text-gray-900 block">{item.name}</Text>
                   <Text className="text-gray-500 block">原定 {item.time}</Text>
                </View>
                <Button size="mini" className="bg-white text-red-600 border border-red-200 font-bold px-4 py-2 m-0 rounded-full" onClick={() => handleTake(item)}>补记</Button>
              </View>
            ))}
          </View>
        )}

        {/* Completed list */}
        <View className="bg-gray-100 rounded-[24px] p-5">
           <View className="flex justify-between items-center mb-4">
             <Text className="text-lg font-bold text-gray-500">已完成的任务</Text>
             <Text className="text-lg font-bold text-yinban-primary">{takenMeds.length}</Text>
           </View>
           {takenMeds.length > 0 ? (
             takenMeds.map(item => (
               <View key={item.logId} className="flex items-center py-3 border-b border-gray-200 last:border-0 last:pb-0">
                 <View className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center mr-3">
                    <Check size={14} color="#fff" />
                 </View>
                 <Text className="text-lg text-gray-400 line-through decoration-gray-400 flex-1">{item.name}</Text>
                 <Text className="text-base text-gray-400">{item.time}</Text>
               </View>
             ))
           ) : (
             <Text className="text-gray-400 text-center py-4">今天还没有吃过药哦</Text>
           )}
        </View>
      </ScrollView>
    </PageShell>
  )

  // --- FAMILY VIEW ---
  const renderFamilyView = () => (
    <PageShell roleTone="family" className="bg-gray-50 min-h-screen relative pb-20">
      <View className="bg-white pb-4 pt-4 px-5 sticky top-0 z-10 shadow-sm">
        <View className="flex justify-between items-center mb-4">
          <View>
            <Text className="text-xl font-bold text-gray-900 block">服药管理</Text>
            <Text className="text-xs text-gray-500">今日进度 {progress}%</Text>
          </View>
          <View className="flex gap-2">
             <Button className="m-0 bg-gray-100 p-2 rounded-full border-none flex items-center justify-center w-8 h-8" onClick={loadData}><More size={16} color="#666" /></Button>
          </View>
        </View>
        
        {/* Quick Stats */}
        <View className="grid grid-cols-3 gap-3">
          <View className="bg-orange-50 p-3 rounded-xl text-center">
            <Text className="text-xs text-orange-600 block mb-1">待服药</Text>
            <Text className="text-xl font-bold text-orange-700">{pendingMeds.length}</Text>
          </View>
          <View className="bg-red-50 p-3 rounded-xl text-center">
            <Text className="text-xs text-red-600 block mb-1">异常</Text>
            <Text className="text-xl font-bold text-red-700">{missedMeds.length}</Text>
          </View>
          <View className="bg-green-50 p-3 rounded-xl text-center">
            <Text className="text-xs text-green-600 block mb-1">已完成</Text>
            <Text className="text-xl font-bold text-green-700">{takenMeds.length}</Text>
          </View>
        </View>
      </View>

      <ScrollView className="px-4 py-4 h-[calc(100vh-140px)]" scrollY>
        {/* Timeline View */}
        <View className="mb-6">
          <Text className="text-sm font-bold text-gray-700 mb-3 block">今日记录</Text>
          <View className="bg-white rounded-xl shadow-sm overflow-hidden">
            {todayMeds.length === 0 ? (
               <View className="p-8 text-center text-gray-400 text-sm">今日无服药计划</View>
            ) : (
              todayMeds.map((item, idx) => (
                <View key={`${item.logId}-${idx}`} className="flex p-4 border-b border-gray-100 last:border-0 items-start">
                  <View className="mr-3 flex flex-col items-center pt-1">
                    <Text className="text-xs font-bold text-gray-500 w-10 text-center">{item.time}</Text>
                    <View className={`w-0.5 h-full min-h-[20px] mt-1 bg-gray-100`} />
                  </View>
                  <View className="flex-1">
                    <View className="flex justify-between items-start mb-1">
                      <Text className={`text-base font-medium ${item.status === 'taken' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{item.name}</Text>
                      {item.status === 'pending' && <Text className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">待服</Text>}
                      {item.status === 'taken' && <Text className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">已服</Text>}
                      {item.status === 'missed' && <Text className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">超时</Text>}
                      {item.status === 'skipped' && <Text className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">跳过</Text>}
                    </View>
                    <Text className="text-xs text-gray-400 block mb-2">{item.dosage}</Text>
                    
                    {item.status === 'pending' && (
                      <View className="flex gap-2 justify-end mt-1">
                        <Button className="m-0 text-xs px-3 py-1 bg-gray-50 text-gray-500 rounded border-none" hoverClass="bg-gray-200" onClick={() => handleSkip(item)}>跳过</Button>
                        <Button className="m-0 text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded border-none" hoverClass="bg-blue-100" onClick={() => handleTake(item)}>确认已服</Button>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Plan List */}
        <View className="mb-24">
           <Text className="text-sm font-bold text-gray-700 mb-3 block">长期计划 ({activePlans.length})</Text>
           <View className="grid gap-3">
             {activePlans.map(plan => (
               <View key={plan.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center active:bg-gray-50" onClick={() => Taro.navigateTo({ url: `/subpackages/medication/pages/detail/index?id=${plan.id}` })}>
                 <View>
                   <Text className="text-sm font-bold text-gray-900 block mb-1">{plan.name}</Text>
                   <Text className="text-xs text-gray-500 block">{plan.frequency} · {plan.dosage}</Text>
                 </View>
                 <ArrowRight size={14} color="#ccc" />
               </View>
             ))}
           </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-6 left-0 right-0 px-6">
        <Button 
          className="w-full bg-gray-900 text-white rounded-full py-3 shadow-lg flex items-center justify-center font-bold text-sm"
          onClick={() => Taro.navigateTo({ url: '/subpackages/medication/pages/add/index' })}
        >
          <Plus size={16} className="mr-2" /> 新增计划
        </Button>
      </View>
    </PageShell>
  )

  return isElder ? renderElderView() : renderFamilyView()
}
