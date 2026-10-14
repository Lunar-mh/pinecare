import { useCallback, useEffect, useMemo, useState } from 'react'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { View, Text, ScrollView, Button, Image } from '@tarojs/components'
import { Clock, Message, Service, Star, ArrowRight, User, Location, Medical } from '@nutui/icons-react-taro'
import { ActionGrid, DataPanel, EmptyState, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { createAppointment, getMedicalConsultations, getMedicalReports, getMyAppointments, searchDoctors, startMedicalConsultation } from '@/services/modules/medical'
import type { Appointment, Doctor, MedicalReport, MedicalConsultation } from '@/services/types'
import { useRole } from '@/hooks/useRole'
import './index.scss'

export default function MedicalIndex() {
  const { isElder } = useRole()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [reports, setReports] = useState<MedicalReport[]>([])
  const [consultations, setConsultations] = useState<MedicalConsultation[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [doctorRes, appointmentRes] = await Promise.all([
        searchDoctors({ page: 1, pageSize: 4, isOnline: true }),
        getMyAppointments({ page: 1, pageSize: 3 }),
      ])
      setDoctors(doctorRes?.list || [])
      setAppointments(appointmentRes?.list || [])
    } catch (e) {
      console.error('load medical failed', e)
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
        eyebrow="我的医生"
        title="看病就医"
        subtitle="这里有您的预约和体检报告。"
      />

      <ScrollView className="flex-1 px-4 -mt-4 pb-20" scrollY>
         {/* Upcoming Appointment */}
         {appointments.length > 0 ? (
            <View className="bg-yinban-primary rounded-[24px] p-6 shadow-lg shadow-blue-200 mb-6 text-white relative overflow-hidden">
               <View className="absolute top-0 right-0 bg-white/20 px-4 py-2 rounded-bl-xl font-bold">
                  {new Date(appointments[0].startTime).toLocaleDateString()}
               </View>
               <Text className="text-xl font-bold block mb-2 opacity-80">下次看诊</Text>
               <Text className="text-3xl font-bold block mb-4">{appointments[0].doctorName}</Text>
               <View className="flex items-center gap-2 mb-6 opacity-90">
                  <Location size={20} />
                  <Text className="text-lg">{appointments[0].hospitalName}</Text>
               </View>
               <Button className="w-full bg-white text-yinban-primary font-bold text-lg h-12 rounded-xl flex items-center justify-center">
                  查看详情
               </Button>
            </View>
         ) : (
            <View className="bg-white p-6 rounded-[24px] shadow-sm mb-6 flex flex-col items-center justify-center min-h-[160px]">
               <Medical size={48} className="text-gray-300 mb-4" />
               <Text className="text-xl font-bold text-gray-400">最近没有预约</Text>
            </View>
         )}

         <SectionBlock title="家庭医生" description="有事直接联系">
            <View className="bg-white rounded-[24px] p-4 shadow-sm flex items-center">
               <View className="w-16 h-16 rounded-full bg-blue-50 mr-4 flex items-center justify-center">
                  <User size={32} className="text-blue-500" />
               </View>
               <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-900 block">李医生</Text>
                  <Text className="text-gray-500">全科医生 · 此刻在线</Text>
               </View>
               <Button size="mini" className="bg-green-500 text-white border-none rounded-full px-5 py-2 font-bold m-0 h-10 flex items-center">呼叫</Button>
            </View>
         </SectionBlock>

         <View className="grid grid-cols-2 gap-4 mt-6">
            <View className="bg-white p-6 rounded-[24px] shadow-sm flex flex-col items-center justify-center active:bg-gray-50">
               <View className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                  <Star size={32} className="text-purple-600" />
               </View>
               <Text className="text-lg font-bold text-gray-900">体检报告</Text>
            </View>
            <View className="bg-white p-6 rounded-[24px] shadow-sm flex flex-col items-center justify-center active:bg-gray-50">
               <View className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-3">
                  <Clock size={32} className="text-orange-600" />
               </View>
               <Text className="text-lg font-bold text-gray-900">就诊历史</Text>
            </View>
         </View>
      </ScrollView>
    </PageShell>
  )

  // --- FAMILY VIEW ---
  const renderFamilyView = () => (
    <PageShell roleTone="family" className="bg-gray-50 min-h-screen">
      <View className="bg-white p-4 pt-12 shadow-sm sticky top-0 z-10 flex justify-between items-center">
        <View>
          <Text className="text-xl font-bold text-gray-900 block">就医管理</Text>
          <Text className="text-sm text-gray-500">预约挂号与报告查询</Text>
        </View>
        <Button size="mini" className="bg-blue-600 text-white border-none rounded-full px-4 font-bold text-xs m-0">
           + 新预约
        </Button>
      </View>

      <ScrollView className="p-4" scrollY>
         <SectionBlock title="待就诊" description="即将到来的预约">
            {appointments.length > 0 ? (
               <View className="space-y-3">
                  {appointments.map(apt => (
                     <View key={apt.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
                        <View className="flex justify-between items-start mb-2">
                           <Text className="text-lg font-bold text-gray-900">{apt.doctorName}</Text>
                           <Text className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold">待就诊</Text>
                        </View>
                        <Text className="text-sm text-gray-600 mb-1">{apt.hospitalName}</Text>
                        <Text className="text-sm text-gray-400">{new Date(apt.startTime).toLocaleString()}</Text>
                     </View>
                  ))}
               </View>
            ) : (
               <View className="text-center py-6 text-gray-400 text-sm bg-white rounded-xl">暂无预约</View>
            )}
         </SectionBlock>

         <View className="h-6" />

         <SectionBlock title="家庭医生" description="签约医生团队">
            <View className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
               {doctors.map(doc => (
                  <View key={doc.id} className="p-4 flex items-center justify-between">
                     <View className="flex items-center">
                        <View className="w-10 h-10 rounded-full bg-gray-200 mr-3" />
                        <View>
                           <Text className="text-sm font-bold text-gray-900 block">{doc.name}</Text>
                           <Text className="text-xs text-gray-500">{doc.title} · {doc.department}</Text>
                        </View>
                     </View>
                     <Button size="mini" className="m-0 bg-gray-100 text-gray-600 h-8 px-3 rounded text-xs border-none">咨询</Button>
                  </View>
               ))}
            </View>
         </SectionBlock>
      </ScrollView>
    </PageShell>
  )

  return isElder ? renderElderView() : renderFamilyView()
}
