import { useCallback, useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { Loading, TrendingUp } from '@nutui/icons-react-taro'
import { PageShell, HeroHeader, DataPanel, SectionBlock } from '@/components/shell'
import { getBloodPressureTrend, getHeartRateTrend } from '@/services/modules/health'
import { useRole } from '@/hooks/useRole'
import './index.scss'

export default function HealthTrendPage() {
  const { isElder } = useRole()
  const [bp, setBp] = useState<{ dates: string[]; systolic: number[]; diastolic: number[] } | null>(null)
  const [hr, setHr] = useState<{ dates: string[]; values: number[] } | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [bpRes, hrRes] = await Promise.all([getBloodPressureTrend(7), getHeartRateTrend(7)])
      setBp(bpRes)
      setHr(hrRes)
    } catch (e) {
      console.error('load health trend failed', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // --- ELDER VIEW ---
  const renderElderView = () => (
    <PageShell roleTone="elder" className="bg-yinban-bg min-h-screen">
      <HeroHeader
        roleTone="elder"
        eyebrow="趋势概览"
        title="一周变化看这里"
        subtitle="帮您整理了最近七天的血压和心率，看看是稳定还是波动。"
      />

      <ScrollView className="px-5 -mt-6 pb-24" scrollY>
        {loading ? <Loading className="animate-spin m-auto block mt-10" /> : (
          <>
            <SectionBlock title="血压变化" description="最近 7 天的记录。">
              {bp?.dates?.length ? (
                <View className="space-y-2">
                   {bp.dates.map((date, i) => (
                     <View key={date} className="bg-white p-4 rounded-xl flex justify-between items-center shadow-sm">
                        <Text className="font-bold text-gray-700">{date}</Text>
                        <Text className="text-xl font-bold text-blue-600">{bp.systolic[i]}/{bp.diastolic[i]}</Text>
                     </View>
                   ))}
                </View>
              ) : <DataPanel tone="info"><Text className="text-gray-500">最近没有足够的数据。</Text></DataPanel>}
            </SectionBlock>

            <SectionBlock title="心率变化" description="最近 7 天的记录。">
              {hr?.dates?.length ? (
                <View className="space-y-2">
                   {hr.dates.map((date, i) => (
                     <View key={date} className="bg-white p-4 rounded-xl flex justify-between items-center shadow-sm">
                        <Text className="font-bold text-gray-700">{date}</Text>
                        <Text className="text-xl font-bold text-red-600">{hr.values[i]} <Text className="text-sm text-gray-400">bpm</Text></Text>
                     </View>
                   ))}
                </View>
              ) : <DataPanel tone="info"><Text className="text-gray-500">最近没有足够的数据。</Text></DataPanel>}
            </SectionBlock>
          </>
        )}
      </ScrollView>
    </PageShell>
  )

  // --- FAMILY VIEW ---
  const renderFamilyView = () => (
    <PageShell roleTone="family" className="bg-gray-50 min-h-screen">
       <View className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center justify-between">
         <View>
           <Text className="text-xl font-bold text-gray-900 block">七日趋势</Text>
           <Text className="text-xs text-gray-500">近一周的关键指标波动情况</Text>
         </View>
         <TrendingUp size={24} color="#3B82F6" />
       </View>

       <ScrollView className="p-4" scrollY>
          {loading ? <Loading className="animate-spin m-auto block mt-10" /> : (
             <View className="space-y-6">
                {/* BP Chart Simulation */}
                <View className="bg-white p-4 rounded-xl shadow-sm">
                   <Text className="text-sm font-bold text-gray-500 mb-4 block border-b pb-2">血压趋势 (7天)</Text>
                   {bp?.dates?.length ? (
                     <View className="flex justify-between items-end h-32 px-2">
                        {bp.systolic.map((val, i) => (
                          <View key={i} className="flex flex-col items-center flex-1 gap-1">
                             <View className="w-2 bg-blue-200 rounded-t-sm relative group" style={{ height: `${Math.min(val/2, 100)}%` }}>
                                <View className="absolute bottom-full mb-1 text-[10px] text-gray-500 hidden group-hover:block whitespace-nowrap">{val}/{bp.diastolic[i]}</View>
                             </View>
                             <View className="w-2 bg-blue-400 rounded-b-sm -mt-1" style={{ height: `${Math.min(bp.diastolic[i]/2, 60)}%` }} />
                             <Text className="text-[10px] text-gray-400 mt-1 transform -rotate-45 origin-top-left">{bp.dates[i].slice(5)}</Text>
                          </View>
                        ))}
                     </View>
                   ) : <Text className="text-center text-gray-400 py-8">数据不足</Text>}
                </View>

                {/* HR Chart Simulation */}
                <View className="bg-white p-4 rounded-xl shadow-sm">
                   <Text className="text-sm font-bold text-gray-500 mb-4 block border-b pb-2">心率趋势 (7天)</Text>
                   {hr?.dates?.length ? (
                     <View className="flex justify-between items-end h-32 px-2">
                        {hr.values.map((val, i) => (
                          <View key={i} className="flex flex-col items-center flex-1 gap-1">
                             <View className="w-2 bg-red-400 rounded-full relative group" style={{ height: `${Math.min(val/1.5, 100)}%` }}>
                                <View className="absolute bottom-full mb-1 text-[10px] text-gray-500">{val}</View>
                             </View>
                             <Text className="text-[10px] text-gray-400 mt-1 transform -rotate-45 origin-top-left">{hr.dates[i].slice(5)}</Text>
                          </View>
                        ))}
                     </View>
                   ) : <Text className="text-center text-gray-400 py-8">数据不足</Text>}
                </View>
             </View>
          )}
       </ScrollView>
    </PageShell>
  )

  return isElder ? renderElderView() : renderFamilyView()
}
