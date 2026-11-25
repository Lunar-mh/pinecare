import { useCallback, useEffect, useState } from 'react'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { View, Text, ScrollView, Map, Button, CoverView, CoverImage } from '@tarojs/components'
import { Location, Plus, User, Check, Warning, Setting } from '@nutui/icons-react-taro'
import { DataPanel, EmptyState, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { createSafeZone, getCurrentLocation, getFamilyLocations, getSafeZones } from '@/services/modules/location'
import type { SafeZone } from '@/services/types'
import type { FamilyMemberLocation } from '@/services/modules/location'
import { useRole } from '@/hooks/useRole'
import { Icon } from '@/components/icons'
import './index.scss'

export default function LocationIndex() {
  const { isElder } = useRole()
  const [myLocation, setMyLocation] = useState<{lat: number, lng: number, address: string} | null>(null)
  const [familyLocations, setFamilyLocations] = useState<FamilyMemberLocation[]>([])
  const [safeZones, setSafeZones] = useState<SafeZone[]>([])
  const [loading, setLoading] = useState(true)

  // Markers for map
  const [markers, setMarkers] = useState<any[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Get Self Location
      try {
        const current = await Taro.getLocation({ type: 'gcj02' })
        setMyLocation({
           lat: current.latitude,
           lng: current.longitude,
           address: '当前位置' // Ideally reverse geocode here
        })
      } catch (e) {
        console.log('Location permission denied')
      }

      // 2. Get Related Data
      const [family, zones] = await Promise.all([getFamilyLocations(), getSafeZones()])
      setFamilyLocations(family || [])
      setSafeZones(zones || [])
      
    } catch (e) {
      console.error('load location data failed', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Update markers when data changes
  useEffect(() => {
    const newMarkers: any[] = []
    
    if (myLocation) {
      newMarkers.push({
        id: 0,
        latitude: myLocation.lat,
        longitude: myLocation.lng,
        title: '我在这里',
        iconPath: isElder ? 'https://img.icons8.com/color/48/elderly-person.png' : 'https://img.icons8.com/color/48/user-location.png',
        width: 40,
        height: 40,
        callout: { content: '我在这里', display: 'ALWAYS', padding: 8, borderRadius: 8 }
      })
    }

    familyLocations.forEach((fam, idx) => {
      newMarkers.push({
        id: idx + 1,
        latitude: fam.location?.latitude ?? (fam as any).lat ?? 39.9,
        longitude: fam.location?.longitude ?? (fam as any).lng ?? 116.4,
        title: fam.memberName || (fam as any).name || '家人',
        iconPath: 'https://img.icons8.com/color/48/family.png', // Placeholder
        width: 32,
        height: 32,
        callout: { content: fam.memberName || (fam as any).name || '家人', display: 'ALWAYS', padding: 4, borderRadius: 4 }
      })
    })

    setMarkers(newMarkers)
  }, [myLocation, familyLocations, isElder])

  const handleShare = () => {
    Taro.showToast({ title: '位置已发送给家人', icon: 'success' })
  }

  // --- ELDER VIEW ---
  const renderElderView = () => (
    <PageShell roleTone="elder" className="h-screen flex flex-col bg-white">
      <HeroHeader
        roleTone="elder"
        eyebrow="我的位置"
        title="我在哪里？"
        subtitle={myLocation ? "定位正常，家人知道您在这里。" : "正在获取您的位置..."}
      />

      <View className="flex-1 relative rounded-t-3xl overflow-hidden -mt-6 shadow-top">
        {myLocation ? (
          <Map
            className="w-full h-full"
            latitude={myLocation.lat}
            longitude={myLocation.lng}
            scale={16}
            markers={markers}
            showLocation
            onError={() => {}}
          />
        ) : (
          <View className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
             <Location size={48} className="mb-2 animate-bounce" />
             <Text>正在定位...</Text>
          </View>
        )}
        
        {/* Floating Action Button */}
        <CoverView className="absolute bottom-10 left-0 right-0 px-6 pointer-events-none flex justify-center">
            <Button className="w-full bg-yinban-primary text-white font-bold h-14 rounded-full shadow-lg flex items-center justify-center text-xl pointer-events-auto" onClick={handleShare}>
              告诉家人我在这里
            </Button>
        </CoverView>
      </View>
    </PageShell>
  )

  // --- FAMILY VIEW ---
  const renderFamilyView = () => (
    <PageShell roleTone="family" className="h-screen flex flex-col bg-gray-50">
      <View className="bg-white p-4 pt-12 shadow-sm z-10">
        <Text className="text-xl font-bold text-gray-900 block">位置守护</Text>
        <Text className="text-base text-gray-600">
           {myLocation ? `长辈位置更新于刚刚` : '正在同步长辈位置...'}
        </Text>
      </View>
      
      <View className="flex-1 relative">
         <Map
            className="w-full h-full"
            latitude={myLocation?.lat || 39.9}
            longitude={myLocation?.lng || 116.4}
            scale={14}
            markers={markers}
            onError={() => {}}
            circles={safeZones.map(zone => ({
              latitude: zone.latitude ?? zone.lat ?? 39.9,
              longitude: zone.longitude ?? zone.lng ?? 116.4,
              radius: zone.radius,
              color: '#4ADE8033',
              fillColor: '#4ADE8033',
              strokeWidth: 2
            }))}
         />

         {/* Zone List Overlay */}
         <CoverView className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-lg transform transition-transform duration-300">
            <View className="flex justify-between items-center mb-4">
               <Text className="text-lg font-bold text-gray-800">安全围栏</Text>
               <View className="bg-gray-100 p-2 rounded-full" onClick={() => Taro.navigateTo({ url: '/subpackages/location/pages/zone/add' })}>
                  <Plus size={16} color="#666" />
               </View>
            </View>
            <ScrollView scrollY className="max-h-48">
               {safeZones.length === 0 ? (
                  <View className="py-4 text-center text-gray-500 text-base">暂无围栏，点击上方 + 添加</View>
               ) : (
                  safeZones.map(zone => (
                     <View key={zone.id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                        <View>
                           <Text className="text-lg font-bold text-gray-900 block">{zone.name}</Text>
                           <Text className="text-base text-gray-500">半径 {zone.radius}米</Text>
                        </View>
                        <Setting size={16} color="#ccc" />
                     </View>
                  ))
               )}
            </ScrollView>
         </CoverView>
      </View>
    </PageShell>
  )

  return isElder ? renderElderView() : renderFamilyView()
}
