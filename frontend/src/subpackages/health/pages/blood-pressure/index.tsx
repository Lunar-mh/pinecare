import { useCallback, useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView, Input, Button } from '@tarojs/components'
import { Heart, Check, Loading, Warning } from '@nutui/icons-react-taro'
import { PageShell, HeroHeader, StickyPrimaryAction } from '@/components/shell'
import { addBloodPressureRecord, getBloodPressureRecords } from '@/services/modules/health'
import type { BloodPressureRecord } from '@/services/types'
import { useRole } from '@/hooks/useRole'
import './index.scss'

export default function BloodPressurePage() {
  const { isElder } = useRole()
  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [pulse, setPulse] = useState('')
  const [records, setRecords] = useState<BloodPressureRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getBloodPressureRecords({ page: 1, pageSize: 20 })
      setRecords(res.list)
    } catch (e) {
      console.error('Failed to load BP records', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async () => {
    if (!systolic || !diastolic) {
      Taro.showToast({ title: '请输入高压和低压', icon: 'none' })
      return
    }
    const sys = parseInt(systolic)
    const dia = parseInt(diastolic)
    if (isNaN(sys) || isNaN(dia)) {
      Taro.showToast({ title: '请输入有效数字', icon: 'none' })
      return
    }

    try {
      await addBloodPressureRecord({
        systolic: sys,
        diastolic: dia,
        pulse: pulse ? parseInt(pulse) : undefined,
        measuredAt: new Date().toISOString()
      })
      Taro.showToast({ title: '记录成功', icon: 'success' })
      setSystolic('')
      setDiastolic('')
      setPulse('')
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
        eyebrow="记录血压"
        title="量完血压，随手记一下"
        subtitle="只要输入上面的高压和下面的低压，在这个页面点一下保存就好。"
      />

      <ScrollView className="px-5 -mt-6 pb-24" scrollY>
        {/* INPUT CARD */}
        <View className="bg-white rounded-[24px] p-6 shadow-sm mb-6">
           <View className="mb-6">
             <Text className="text-gray-500 text-lg mb-2 block">收缩压 (高压)</Text>
             <View className="flex items-end border-b-2 border-primary-200 py-2">
               <Input
                 className="text-4xl font-bold text-gray-900 flex-1 h-12"
                 type="number"
                 placeholder="例如 120"
                 placeholderClass="text-gray-300"
                 value={systolic}
                 onInput={e => setSystolic(e.detail.value)}
               />
               <Text className="text-gray-400 text-xl ml-2 mb-1">mmHg</Text>
             </View>
           </View>

           <View className="mb-6">
             <Text className="text-gray-500 text-lg mb-2 block">舒张压 (低压)</Text>
             <View className="flex items-end border-b-2 border-primary-200 py-2">
               <Input
                 className="text-4xl font-bold text-gray-900 flex-1 h-12"
                 type="number"
                 placeholder="例如 80"
                 placeholderClass="text-gray-300"
                 value={diastolic}
                 onInput={e => setDiastolic(e.detail.value)}
               />
               <Text className="text-gray-400 text-xl ml-2 mb-1">mmHg</Text>
             </View>
           </View>
           
           <View>
             <Text className="text-gray-500 text-lg mb-2 block">脉搏 (选填)</Text>
             <View className="flex items-end border-b border-gray-100 py-2">
               <Input
                 className="text-2xl font-bold text-gray-900 flex-1 h-10"
                 type="number"
                 placeholder="例如 75"
                 placeholderClass="text-gray-300"
                 value={pulse}
                 onInput={e => setPulse(e.detail.value)}
               />
               <Text className="text-gray-400 text-lg ml-2 mb-1">次/分</Text>
             </View>
           </View>
        </View>

        {/* RECENT RECORD */}
        {records.length > 0 && (
          <View className="px-2">
            <Text className="text-lg font-bold text-gray-800 mb-3 block">最近的一条记录</Text>
            <View className="bg-white rounded-[20px] p-5 flex items-center justify-between opacity-80">
               <View>
                 <Text className="text-2xl font-bold text-gray-700 block mb-1">
                   {records[0].systolic}/{records[0].diastolic} <Text className="text-base font-normal text-gray-600">mmHg</Text>
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
               <Text className="text-xl font-bold text-gray-900 block">血压记录</Text>
               <Text className="text-base text-gray-500">{records.length} 条历史数据</Text>
            </View>
            <Button size="mini" className="bg-blue-600 text-white border-none rounded-full px-4 py-1 text-base font-normal m-0" onClick={() => setSystolic(systolic ? '' : 'show_input')}>
               {systolic === 'show_input' ? '取消' : '添加记录'}
            </Button>
         </View>

         {/* FAMILY INPUT AREA (Hidden by default unless toggled) */}
         {systolic === 'show_input' && (
           <View className="bg-blue-50 p-4 rounded-xl mb-2 animate-fade-in">
             <View className="flex gap-2 mb-3">
               <View className="flex-1 bg-white rounded-lg p-2">
                 <Text className="text-base text-gray-600 block">收缩压</Text>
                 <Input className="font-bold text-lg" type="number" placeholder="0" onInput={e => setSystolic(e.detail.value === 'show_input' ? '' : e.detail.value)} />
               </View>
               <View className="flex-1 bg-white rounded-lg p-2">
                 <Text className="text-base text-gray-600 block">舒张压</Text>
                 <Input className="font-bold text-lg" type="number" placeholder="0" onInput={e => setDiastolic(e.detail.value)} />
               </View>
               <View className="flex-1 bg-white rounded-lg p-2">
                 <Text className="text-base text-gray-600 block">脉搏</Text>
                 <Input className="font-bold text-lg" type="number" placeholder="选填" onInput={e => setPulse(e.detail.value)} />
               </View>
             </View>
             <Button className="w-full bg-blue-600 text-white rounded-lg" onClick={handleSave}>保存</Button>
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
                      <Text className="text-xl font-bold text-gray-900 mr-2">{record.systolic}/{record.diastolic}</Text>
                      <Text className="text-base text-gray-500">mmHg</Text>
                    </View>
                    <Text className="text-base text-gray-500">{new Date(record.measuredAt).toLocaleString()}</Text>
                  </View>
                  
                  <View className="text-right">
                    <View className={`inline-block px-2 py-0.5 rounded text-base font-bold mb-1 ${
                       record.status === 'danger' ? 'bg-red-100 text-red-600' : 
                       record.status === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {record.status === 'danger' ? '危险' : record.status === 'warning' ? '偏高' : '正常'}
                    </View>
                    {record.pulse && <Text className="block text-base text-gray-500">❤ {record.pulse} bpm</Text>}
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

