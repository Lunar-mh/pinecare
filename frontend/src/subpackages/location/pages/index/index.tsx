import { useCallback, useEffect, useState } from 'react'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { View, Text, ScrollView, Switch } from '@tarojs/components'
import { Location, Plus, User } from '@nutui/icons-react-taro'
import {
  DataPanel,
  EmptyState,
  HeroHeader,
  PageShell,
  SectionBlock,
  StatusCard,
  StickyPrimaryAction,
} from '@/components/shell'
import { getCurrentLocation, getFamilyLocations, getSafeZones, toggleSafeZone, updateLocation } from '@/services/modules/location'
import type { SafeZone } from '@/services/types'
import type { FamilyMemberLocation } from '@/services/modules/location'
import './index.scss'

type TabType = 'my' | 'family' | 'zones'

export default function LocationIndex() {
  const [activeTab, setActiveTab] = useState<TabType>('family')
  const [myLocation, setMyLocation] = useState('')
  const [myLocationTime, setMyLocationTime] = useState('')
  const [familyLocations, setFamilyLocations] = useState<FamilyMemberLocation[]>([])
  const [safeZones, setSafeZones] = useState<SafeZone[]>([])
  const [loading, setLoading] = useState(true)
  const [locating, setLocating] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [current, family, zones] = await Promise.all([getCurrentLocation(), getFamilyLocations(), getSafeZones()])
      setMyLocation(current?.address || '还没有同步当前位置')
      setMyLocationTime(current?.updatedAt || '')
      setFamilyLocations(family || [])
      setSafeZones(zones || [])
    } catch (loadError) {
      console.error('load location page failed', loadError)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  usePullDownRefresh(() => {
    loadData().finally(() => Taro.stopPullDownRefresh())
  })

  const handleRefreshLocation = async () => {
    setLocating(true)
    try {
      const current = await Taro.getLocation({ type: 'gcj02' })
      const updated = await updateLocation({ latitude: current.latitude, longitude: current.longitude })
      setMyLocation(updated.address || '当前位置已同步')
      setMyLocationTime(updated.updatedAt || new Date().toISOString())
      Taro.showToast({ title: '位置已刷新', icon: 'success' })
    } catch (refreshError) {
      console.error('refresh current location failed', refreshError)
      Taro.showToast({ title: '刷新失败，请检查定位权限', icon: 'none' })
    } finally {
      setLocating(false)
    }
  }

  const handleToggleZone = async (zone: SafeZone) => {
    try {
      await toggleSafeZone(zone.id, !zone.isActive)
      setSafeZones(prev => prev.map(item => (item.id === zone.id ? { ...item, isActive: !item.isActive } : item)))
    } catch (toggleError) {
      console.error('toggle safe zone failed', toggleError)
      Taro.showToast({ title: '切换失败，请稍后再试', icon: 'none' })
    }
  }

  return (
    <PageShell roleTone="family" className="location-overview-page">
      <HeroHeader
        roleTone="family"
        eyebrow="定位守护"
        title="先看人在哪，再看异常有没有发生"
        subtitle="定位页按监护习惯重新组织，先看家人状态，再看自己的位置和安全区设置。"
      />

      <ScrollView className="location-overview-page__scroll" scrollY>
        <View className="location-overview-page__grid">
          <StatusCard title="在线家人" value={`${familyLocations.filter(item => item.isOnline).length}`} unit="人" hint="当前位置最近有同步" tone="success" icon={<User size={22} />} />
          <StatusCard title="安全区" value={`${safeZones.filter(item => item.isActive).length}`} unit="个" hint="已启用的区域提醒" tone="primary" icon={<Location size={22} />} />
        </View>

        <View className="location-overview-page__tabs">
          <View className={`location-overview-page__tab${activeTab === 'family' ? ' location-overview-page__tab--active' : ''}`} onClick={() => setActiveTab('family')}><Text>家人位置</Text></View>
          <View className={`location-overview-page__tab${activeTab === 'my' ? ' location-overview-page__tab--active' : ''}`} onClick={() => setActiveTab('my')}><Text>我的位置</Text></View>
          <View className={`location-overview-page__tab${activeTab === 'zones' ? ' location-overview-page__tab--active' : ''}`} onClick={() => setActiveTab('zones')}><Text>安全区</Text></View>
        </View>

        {activeTab === 'family' ? (
          <SectionBlock title="家人位置" description="优先看老人和主要联系人有没有掉线或长时间未更新。">
            {loading ? (
              <DataPanel tone="info"><Text className="location-overview-page__text">正在同步家人位置...</Text></DataPanel>
            ) : familyLocations.length === 0 ? (
              <EmptyState title="暂时没有共享中的位置" description="请先确认家人是否已开启定位共享。" icon={<Location size={28} />} />
            ) : (
              <View className="location-overview-page__stack">
                {familyLocations.map(item => (
                  <DataPanel key={item.memberId} tone={item.isOnline ? 'success' : 'warning'}>
                    <Text className="location-overview-page__title">{item.memberName} · {item.relation}</Text>
                    <Text className="location-overview-page__text">{item.location.address || '位置描述暂时缺失'}</Text>
                    <Text className="location-overview-page__meta">{item.isOnline ? '在线' : '离线'} · 最近更新 {new Date(item.location.updatedAt).toLocaleString('zh-CN')}</Text>
                    <View className="location-overview-page__actions">
                      <View className="location-overview-page__button" onClick={() => Taro.openLocation({ latitude: item.location.latitude, longitude: item.location.longitude, name: item.memberName, address: item.location.address })}><Text>查看地图</Text></View>
                    </View>
                  </DataPanel>
                ))}
              </View>
            )}
          </SectionBlock>
        ) : null}

        {activeTab === 'my' ? (
          <SectionBlock title="我的位置" description="确保当前位置和时间是新的，弱网时也能快速手动刷新。">
            <DataPanel tone="primary">
              <Text className="location-overview-page__title">当前位置</Text>
              <Text className="location-overview-page__text">{myLocation}</Text>
              <Text className="location-overview-page__meta">{myLocationTime ? `最近更新 ${new Date(myLocationTime).toLocaleString('zh-CN')}` : '还没有定位时间'}</Text>
              <View className="location-overview-page__actions">
                <View className="location-overview-page__button location-overview-page__button--primary" onClick={handleRefreshLocation}><Text>{locating ? '刷新中...' : '刷新我的位置'}</Text></View>
              </View>
            </DataPanel>
          </SectionBlock>
        ) : null}

        {activeTab === 'zones' ? (
          <SectionBlock title="安全区设置" description="把启用、停用和区域半径集中到同一屏。">
            {safeZones.length === 0 ? (
              <EmptyState title="还没有安全区" description="建议至少设置一个常住地或社区范围，用于离开提醒。" icon={<Location size={28} />} />
            ) : (
              <View className="location-overview-page__stack">
                {safeZones.map(zone => (
                  <DataPanel key={zone.id} tone={zone.isActive ? 'primary' : 'info'}>
                    <View className="location-overview-page__zone-row">
                      <View>
                        <Text className="location-overview-page__title">{zone.name}</Text>
                        <Text className="location-overview-page__text">半径 {zone.radius} 米</Text>
                      </View>
                      <Switch checked={zone.isActive} onChange={() => handleToggleZone(zone)} color="#c97b55" />
                    </View>
                  </DataPanel>
                ))}
              </View>
            )}
          </SectionBlock>
        ) : null}

        <View className="location-overview-page__bottom-space" />
      </ScrollView>

      <StickyPrimaryAction tone="family" label="新增安全区" icon={<Plus size={22} />} onClick={() => Taro.showToast({ title: '下一阶段补充安全区创建表单', icon: 'none' })} />
    </PageShell>
  )
}

