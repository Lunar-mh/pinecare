import { useCallback, useEffect, useState, useRef } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text, ScrollView, Map, Button, Image } from '@tarojs/components'
import { Phone, Service, Warning, Location, Check, Power } from '@nutui/icons-react-taro'
import { DataPanel, EmptyState, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { cancelSOS, getCurrentSOSStatus, getEmergencyContactsWithLocation, triggerSOS } from '@/services/modules/sos'
import { getElderlyOverview } from '@/services/modules/family'
import type { ElderlyOverview, EmergencyContactWithLocation, SOSEvent } from '@/services/types'
import { useRole } from '@/hooks/useRole'
import './index.scss'

export default function SOSIndex() {
  const { isElder } = useRole()
  const [activeSOS, setActiveSOS] = useState<SOSEvent | null>(null)
  const [contacts, setContacts] = useState<EmergencyContactWithLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Get location for map context
      try {
        const loc = await Taro.getLocation({ type: 'gcj02' })
        setLocation({ lat: loc.latitude, lng: loc.longitude })
      } catch (e) {
        console.log('Location permission denied')
      }

      const status = await getCurrentSOSStatus()
      setActiveSOS(status)
      
      const contactsData = await getEmergencyContactsWithLocation()
      setContacts(contactsData || [])

    } catch (e) {
      console.error('load sos data failed', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useDidShow(() => {
    loadData()
  })

  const handleSOS = async () => {
    setTriggering(true)
    try {
      await triggerSOS({ type: 'manual', location: location ? `${location.lat},${location.lng}` : undefined })
      Taro.vibrateLong()
      const status = await getCurrentSOSStatus()
      setActiveSOS(status)
      Taro.showToast({ title: '求救信号已发出', icon: 'success' })
    } catch (e) {
      Taro.showToast({ title: '发送失败，请直接拨打120', icon: 'none' })
    } finally {
      setTriggering(false)
    }
  }

  const handleCancel = async () => {
    if (!activeSOS) return
    try {
      await cancelSOS(activeSOS.id, '误触/已安全')
      setActiveSOS(null)
      Taro.showToast({ title: '警报已解除', icon: 'success' })
    } catch (e) {
      Taro.showToast({ title: '解除失败', icon: 'none' })
    }
  }

  const handleCall = (phone: string) => {
    Taro.makePhoneCall({ phoneNumber: phone })
  }

  // --- ELDER VIEW ---
  const renderElderView = () => (
    <PageShell roleTone="elder" className={`h-screen flex flex-col ${activeSOS ? 'bg-red-50' : 'bg-yinban-bg'}`}>
      <HeroHeader 
        roleTone="elder"
        eyebrow="紧急求助"
        title={activeSOS ? "正在呼救中..." : "遇到紧急情况？"}
        subtitle={activeSOS ? "别怕，我们已经通知了您的家人和社区。" : "按住下面的大按钮，我们马上通知家人。"}
      />

      <View className="flex-1 flex flex-col items-center justify-center px-6">
         {/* SOS BUTTON */}
         <View 
            className={`w-64 h-64 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 ${
               activeSOS 
                 ? 'bg-white border-8 border-red-500 animate-pulse' 
                 : 'bg-red-600 border-8 border-red-200 shadow-red-200'
            }`}
            onClick={activeSOS ? undefined : handleSOS}
            onLongPress={activeSOS ? undefined : handleSOS}
         >
            <View className="flex flex-col items-center">
               {activeSOS ? (
                 <>
                   <Text className="text-red-600 text-3xl font-bold mb-2">已呼救</Text>
                   <Text className="text-gray-500 text-sm">等待接通...</Text>
                 </>
               ) : (
                 <>
                   <Warning size={64} color="#fff" className="mb-4" />
                   <Text className="text-white text-3xl font-bold">按住呼救</Text>
                 </>
               )}
            </View>
         </View>

         {activeSOS && (
            <Button 
              className="mt-12 bg-white text-gray-900 border border-gray-300 w-full py-4 text-lg font-bold rounded-xl shadow-sm active:bg-gray-100"
              onClick={handleCancel}
            >
              我安全了，取消呼救
            </Button>
         )}

         {!activeSOS && (
           <Text className="text-gray-400 mt-8 text-center text-sm">长按 3 秒也可以触发</Text>
         )}
      </View>
      
      {/* QUICK CONTACTS */}
      <View className="bg-white p-6 pb-12 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
         <Text className="text-lg font-bold text-gray-900 mb-4 block">直接给家人打电话</Text>
         <ScrollView scrollX className="whitespace-nowrap flex" showScrollbar={false}>
            {contacts.map(contact => (
              <View key={contact.phone} className="inline-block mr-4 text-center" onClick={() => handleCall(contact.phone)}>
                 <View className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-2 mx-auto">
                    <Phone size={24} className="text-green-600" />
                 </View>
                 <Text className="text-sm font-bold text-gray-800 block">{contact.name}</Text>
                 <Text className="text-xs text-gray-500 block">{contact.relation}</Text>
              </View>
            ))}
            <View className="inline-block text-center" onClick={() => handleCall('120')}>
               <View className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-2 mx-auto">
                  <Warning size={24} className="text-red-600" />
               </View>
               <Text className="text-sm font-bold text-gray-800 block">120急救</Text>
            </View>
         </ScrollView>
      </View>
    </PageShell>
  )

  // --- FAMILY VIEW ---
  const renderFamilyView = () => (
    <PageShell roleTone="family" className="bg-gray-50 min-h-screen">
      {/* HEADER STATUS */}
      <View className={`px-5 pt-12 pb-6 ${activeSOS ? 'bg-red-600 text-white' : 'bg-white text-gray-900 shadow-sm'}`}>
         <Text className="text-2xl font-bold block mb-1">
            {activeSOS ? '⚠️ 紧急求助触发中' : '安全监控中'}
         </Text>
         <Text className={`text-sm ${activeSOS ? 'text-white/80' : 'text-gray-500'}`}>
            {activeSOS ? `长辈在 ${new Date(activeSOS.timestamp).toLocaleTimeString()} 发出了求救信号` : '设备一切正常，未检测到异常。'}
         </Text>

         {activeSOS && (
            <View className="mt-6 flex gap-3">
               <Button className="flex-1 bg-white text-red-600 font-bold border-none" onClick={() => activeSOS.location && Taro.openLocation({ latitude: parseFloat(activeSOS.location.split(',')[0]), longitude: parseFloat(activeSOS.location.split(',')[1]) })}>
                  <Location size={18} className="mr-1" /> 查看位置
               </Button>
               <Button className="flex-1 bg-red-800 text-white font-bold border-none" onClick={() => handleCall(contacts[0]?.phone || '')}>
                  <Phone size={18} className="mr-1" /> 联系长辈
               </Button>
            </View>
         )}
      </View>

      {/* MAP PREVIEW */}
      <View className="h-64 w-full bg-gray-200 relative">
         {location && (
            <Map 
               longitude={location.lng} 
               latitude={location.lat}
               scale={16}
               markers={[{
                  id: 1,
                  longitude: location.lng,
                  latitude: location.lat,
                  title: '当前位置',
                  iconPath: 'https://img.icons8.com/color/48/marker.png',
                  width: 32,
                  height: 32
               }]}
               className="w-full h-full"
            />
         )}
         {!location && <View className="w-full h-full flex items-center justify-center text-gray-400 text-sm">定位获取中...</View>}
      </View>

      <ScrollView className="px-4 py-4" scrollY>
         <SectionBlock title="紧急联系人" description="优先通知顺位">
            <View className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
               {contacts.map((contact, idx) => (
                  <View key={contact.phone} className="p-4 flex justify-between items-center">
                     <View>
                        <Text className="font-bold text-gray-900 block">{contact.name} <Text className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded ml-2">{contact.relation}</Text></Text>
                        <Text className="text-sm text-gray-400">{contact.phone}</Text>
                     </View>
                     <View className="flex gap-2">
                        {idx === 0 && <Text className="text-xs text-red-500 border border-red-200 px-2 py-1 rounded">第一顺位</Text>}
                        <Button size="mini" className="m-0 bg-green-50 text-green-600 border-none w-8 h-8 flex items-center justify-center rounded-full" onClick={() => handleCall(contact.phone)}>
                           <Phone size={14} />
                        </Button>
                     </View>
                  </View>
               ))}
            </View>
         </SectionBlock>

         <View className="h-8" />
      </ScrollView>

      {/* FOOTER ACTIONS - Only clear in family view */}
      {activeSOS && (
         <View className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 flex justify-between items-center px-6">
            <Text className="text-gray-500 text-xs">情况已确认？</Text>
            <Button className="m-0 bg-gray-100 text-gray-600 px-6 h-10 leading-10 text-sm rounded-full font-bold" onClick={handleCancel}>解除警报</Button>
         </View>
      )}
    </PageShell>
  )

  return isElder ? renderElderView() : renderFamilyView()
}
