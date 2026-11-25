import { useCallback, useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView, Input, Button } from '@tarojs/components'
import { Heart, Check, Loading } from '@nutui/icons-react-taro'
import { PageShell, HeroHeader, StickyPrimaryAction } from '@/components/shell'
import { addHeartRateRecord, getHeartRateRecords } from '@/services/modules/health'
import type { HeartRateRecord } from '@/services/types'
import { useRole } from '@/hooks/useRole'
import './index.scss'

export default function HeartRatePage() {
  const { isElder } = useRole()
  const [value, setValue] = useState('')
  const [records, setRecords] = useState<HeartRateRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getHeartRateRecords({ page: 1, pageSize: 20 })
      setRecords(res.list)
    } catch (error) {
      console.error('load heart rate failed', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async () => {
    if (!value) {
      Taro.showToast({ title: '请输入心率数值', icon: 'none' })
      return 
    }
    const val = parseInt(value)
    if (isNaN(val)) {
      Taro.showToast({ title: '请输入有效数字', icon: 'none' })
      return
    }

    try {
      await addHeartRateRecord({ value: val, measuredAt: new Date().toISOString() })
      setValue('')
      Taro.showToast({ title: '记录成功', icon: 'success' })
      loadData()
      if (isElder) {
        setTimeout(() => Taro.navigateBack(), 1500)
      }
    } catch (e) {
      Taro.showToast({ title: '记录失败', icon: 'none' })
    }
  }

  // --- ELDER VIEW ---
  const renderElderView = () => (
    <PageShell roleTone="elder" className="bg-yinban-bg min-h-screen">
      <HeroHeader
        roleTone="elder"
        eyebrow="记录心率"
        title="测完心跳，记在这里"
        subtitle="只需输入每分钟跳动的次数。"
      />

      <ScrollView className="px-5 -mt-6 pb-24" scrollY>
        <View className="bg-white rounded-[24px] p-6 shadow-sm mb-6">
           <View className="mb-2">
             <Text className="text-gray-500 text-lg mb-2 block">心率 (次数/分)</Text>
             <View className="flex items-end border-b-2 border-red-200 py-2">
               <Input
                 className="text-5xl font-bold text-gray-900 flex-1 h-16"
                 type="number"
                 placeholder="例如 75"
                 placeholderClass="text-gray-300"
                 value={value}
                 onInput={e => setValue(e.detail.value)}
               />
               <Text className="text-gray-400 text-xl ml-2 mb-2">bpm</Text>
             </View>
           </View>
        </View>

        {records.length > 0 && (
          <View className="px-2">
            <Text className="text-lg font-bold text-gray-800 mb-3 block">最近的一条记录</Text>
            <View className="bg-white rounded-[20px] p-5 flex items-center justify-between opacity-80">
               <View>
                 <Text className="text-2xl font-bold text-gray-700 block mb-1">
                   {records[0].value} <Text className="text-base font-normal text-gray-600">bpm</Text>
                 </Text>
                 <Text className="text-gray-500 text-base">{new Date(records[0].measuredAt).toLocaleString()}</Text>
               </View>
               <View className={`px-3 py-1 rounded-full text-base font-bold ${
                 records[0].status === 'danger' ? 'bg-red-100 text-red-600' : 
                 records[0].status === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
               }`}>
                 {records[0].status === 'danger' ? '异常' : records[0].status === 'warning' ? '偏高' : '正常'}
               </View>
            </View>
          </View>
        )}
      </ScrollView>

      <StickyPrimaryAction
        tone="elder"
        label="保存记录"
        icon={<Check size={24} />}
        onClick={handleSave}
      />
    </PageShell>
  )

  // --- FAMILY VIEW ---
  const renderFamilyView = () => (
    <PageShell roleTone="family" className="bg-gray-50 min-h-screen">
       <View className="bg-white pt-4 pb-4 px-4 shadow-sm sticky top-0 z-10">
         <View className="flex justify-between items-center mb-4">
            <View className="flex-1">
               <Text className="text-xl font-bold text-gray-900 block">心率记录</Text>
               <Text className="text-base text-gray-500">{records.length} 条历史数据</Text>
            </View>
            <Button size="mini" className="bg-red-500 text-white border-none rounded-full px-4 py-1 text-base font-normal m-0" onClick={() => setValue(value ? '' : 'show_input')}>
               {value === 'show_input' ? '取消' : '添加记录'}
            </Button>
         </View>

         {/* FAMILY INPUT AREA */}
         {value === 'show_input' && (
           <View className="bg-red-50 p-4 rounded-xl mb-2 animate-fade-in">
             <View className="flex gap-2 mb-3">
               <View className="flex-1 bg-white rounded-lg p-2">
                 <Text className="text-base text-gray-600 block">心率 (bpm)</Text>
                 <Input className="font-bold text-lg" type="number" placeholder="0" onInput={e => setValue(e.detail.value === 'show_input' ? '' : e.detail.value)} />
               </View>
             </View>
             <Button className="w-full bg-red-500 text-white rounded-lg" onClick={handleSave}>保存</Button>
           </View>
         )}
      </View>

      <ScrollView className="p-4" scrollY>
         {loading ? (
           <View className="flex justify-center p-8"><Loading className="animate-spin" color="#999" /></View>
         ) : records.length === 0 ? (
           <View className="text-center py-10 text-gray-400">暂无记录</View>
         ) : (
           <View className="space-y-3">
             {records.map(record => (
               <View key={record.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                  <View>
                    <View className="flex items-baseline mb-1">
                      <Text className="text-xl font-bold text-gray-900 mr-2">{record.value}</Text>
                      <Text className="text-base text-gray-500">bpm</Text>
                    </View>
                    <Text className="text-base text-gray-500">{new Date(record.measuredAt).toLocaleString()}</Text>
                  </View>
                  
                  <View className="text-right">
                    <View className={`inline-block px-2 py-0.5 rounded text-base font-bold ${
                       record.status === 'danger' ? 'bg-red-100 text-red-600' : 
                       record.status === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {record.status === 'danger' ? '危险' : record.status === 'warning' ? '偏高' : '正常'}
                    </View>
                  </View>
               </View>
             ))}
           </View>
         )}
      </ScrollView>
    </PageShell>
  )

  return isElder ? renderElderView() : renderFamilyView()
}
