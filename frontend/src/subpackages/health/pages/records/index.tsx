import { useCallback, useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { Loading } from '@nutui/icons-react-taro'
import { PageShell, HeroHeader, DataPanel, SectionBlock } from '@/components/shell'
import { getBloodPressureRecords, getHeartRateRecords } from '@/services/modules/health'
import type { BloodPressureRecord, HeartRateRecord } from '@/services/types'
import { useRole } from '@/hooks/useRole'
import './index.scss'

export default function HealthRecordsPage() {
  const { isElder } = useRole()
  const [bpList, setBpList] = useState<BloodPressureRecord[]>([])
  const [hrList, setHrList] = useState<HeartRateRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [bpRes, hrRes] = await Promise.all([
        getBloodPressureRecords({ page: 1, pageSize: 20 }),
        getHeartRateRecords({ page: 1, pageSize: 20 })
      ])
      setBpList(bpRes.list || [])
      setHrList(hrRes.list || [])
    } catch (e) {
      console.error('load health records failed', e)
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
        eyebrow="健康记录"
        title="所有的记录都在这"
        subtitle="这就是您的电子健康本，医生想看以前的数据，打开这一页就行。"
      />

      <ScrollView className="px-5 -mt-6 pb-24" scrollY>
        <SectionBlock title="血压记录" description="最近测量的 20 条血压数据。">
          {bpList.length === 0 ? (
            <DataPanel tone="info"><Text className="text-gray-500">最近没有记录。</Text></DataPanel>
          ) : (
            <View className="space-y-3">
              {bpList.map(item => (
                <DataPanel key={item.id} tone={item.status === 'danger' ? 'danger' : item.status === 'warning' ? 'warning' : 'success'}>
                  <View className="flex justify-between items-center">
                    <View>
                      <Text className="text-xl font-bold block mb-1">{item.systolic}/{item.diastolic} <Text className="text-base font-normal text-gray-600">mmHg</Text></Text>
                      <Text className="text-base text-gray-500">{new Date(item.measuredAt).toLocaleString()}</Text>
                    </View>
                    <View className={`px-2 py-1 rounded text-base font-bold ${
                       item.status === 'danger' ? 'bg-red-100 text-red-600' : 
                       item.status === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {item.status === 'danger' ? '异常' : item.status === 'warning' ? '偏高' : '正常'}
                    </View>
                  </View>
                </DataPanel>
              ))}
            </View>
          )}
        </SectionBlock>

        <SectionBlock title="心率记录" description="最近测量的 20 条心率数据。">
          {hrList.length === 0 ? (
             <DataPanel tone="info"><Text className="text-gray-500">最近没有记录。</Text></DataPanel>
          ) : (
            <View className="space-y-3">
              {hrList.map(item => (
                <DataPanel key={item.id} tone={item.status === 'danger' ? 'danger' : item.status === 'warning' ? 'warning' : 'success'}>
                  <View className="flex justify-between items-center">
                    <View>
                      <Text className="text-xl font-bold block mb-1">{item.value} <Text className="text-base font-normal text-gray-600">bpm</Text></Text>
                      <Text className="text-base text-gray-500">{new Date(item.measuredAt).toLocaleString()}</Text>
                    </View>
                    <View className={`px-2 py-1 rounded text-base font-bold ${
                       item.status === 'danger' ? 'bg-red-100 text-red-600' : 
                       item.status === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {item.status === 'danger' ? '异常' : item.status === 'warning' ? '偏高' : '正常'}
                    </View>
                  </View>
                </DataPanel>
              ))}
            </View>
          )}
        </SectionBlock>
      </ScrollView>
    </PageShell>
  )

  // --- FAMILY VIEW ---
  const renderFamilyView = () => (
    <PageShell roleTone="family" className="bg-gray-50 min-h-screen">
      <View className="bg-white p-4 shadow-sm sticky top-0 z-10">
        <Text className="text-xl font-bold text-gray-900">健康数据流水</Text>
        <Text className="text-base text-gray-500">按时间倒序排列的所有原始记录</Text>
      </View>

      <ScrollView className="p-4" scrollY>
        {loading ? (
             <View className="flex justify-center p-8"><Loading className="animate-spin" color="#999" /></View>
        ) : (
          <View className="space-y-6">
            <View>
              <Text className="text-base font-bold text-gray-600 mb-2 block uppercase tracking-wider">最新血压 (近20条)</Text>
              {bpList.length === 0 ? <View className="text-gray-400 text-center py-4 bg-white rounded-xl">暂无数据</View> : (
                <View className="bg-white rounded-xl overflow-hidden shadow-sm">
                  {bpList.map((item, idx) => (
                    <View key={item.id} className={`p-4 flex justify-between items-center ${idx < bpList.length - 1 ? 'border-b border-gray-100' : ''}`}>
                       <View>
                         <Text className="text-lg font-bold text-gray-900">{item.systolic}/{item.diastolic}</Text>
                         <Text className="text-base text-gray-500">{new Date(item.measuredAt).toLocaleString()}</Text>
                       </View>
                       <Text className={`text-base font-bold ${
                           item.status === 'danger' ? 'text-red-600' : 
                           item.status === 'warning' ? 'text-orange-600' : 'text-green-600'
                       }`}>
                         {item.status === 'danger' ? '危险' : item.status === 'warning' ? '偏高' : '正常'}
                       </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View>
              <Text className="text-base font-bold text-gray-600 mb-2 block uppercase tracking-wider">最新心率 (近20条)</Text>
              {hrList.length === 0 ? <View className="text-gray-400 text-center py-4 bg-white rounded-xl">暂无数据</View> : (
                <View className="bg-white rounded-xl overflow-hidden shadow-sm">
                  {hrList.map((item, idx) => (
                    <View key={item.id} className={`p-4 flex justify-between items-center ${idx < hrList.length - 1 ? 'border-b border-gray-100' : ''}`}>
                       <View>
                         <Text className="text-lg font-bold text-gray-900">{item.value} bpm</Text>
                         <Text className="text-base text-gray-500">{new Date(item.measuredAt).toLocaleString()}</Text>
                       </View>
                       <Text className={`text-base font-bold ${
                           item.status === 'danger' ? 'text-red-600' : 
                           item.status === 'warning' ? 'text-orange-600' : 'text-green-600'
                       }`}>
                         {item.status === 'danger' ? '危险' : item.status === 'warning' ? '偏高' : '正常'}
                       </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </PageShell>
  )

  return isElder ? renderElderView() : renderFamilyView()
}
