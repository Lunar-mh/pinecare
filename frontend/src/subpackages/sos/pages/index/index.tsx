import { useCallback, useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { Phone, Service, Warning } from '@nutui/icons-react-taro'
import { DataPanel, EmptyState, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { cancelSOS, getCurrentSOSStatus, getEmergencyContactsWithLocation, triggerSOS } from '@/services/modules/sos'
import type { EmergencyContactWithLocation } from '@/services/types'
import './index.scss'

type ActiveSOS = {
  id: string
  triggeredAt: string
}

export default function SOSIndex() {
  const [activeSOS, setActiveSOS] = useState<ActiveSOS | null>(null)
  const [contacts, setContacts] = useState<EmergencyContactWithLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [status, contactList] = await Promise.all([getCurrentSOSStatus(), getEmergencyContactsWithLocation()])
      setActiveSOS(status.active && status.event ? { id: status.event.id, triggeredAt: status.event.triggeredAt } : null)
      setContacts(contactList || [])
    } catch (loadError) {
      console.error('load sos status failed', loadError)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleTrigger = async () => {
    Taro.showModal({
      title: '发起 SOS',
      content: '确认后会同步当前位置，并立即通知家属与照护联系人。',
      confirmColor: '#d75a4a',
      success: async res => {
        if (!res.confirm) return
        setTriggering(true)
        try {
          const location = await Taro.getLocation({ type: 'gcj02' })
          const event = await triggerSOS({
            type: 'manual',
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
              address: '已同步当前位置',
            },
          })
          setActiveSOS({ id: event.id, triggeredAt: event.triggeredAt })
          Taro.showToast({ title: 'SOS 已发出', icon: 'success' })
        } catch (triggerError) {
          console.error('trigger sos failed', triggerError)
          Taro.showToast({ title: '发起失败，请检查定位权限', icon: 'none' })
        } finally {
          setTriggering(false)
        }
      },
    })
  }

  const handleCancel = async () => {
    if (!activeSOS) return
    Taro.showModal({
      title: '取消本次 SOS',
      content: '确认后会结束本次求助，已通知的联系人将看到状态更新。',
      confirmColor: '#d75a4a',
      success: async res => {
        if (!res.confirm) return
        try {
          await cancelSOS(activeSOS.id)
          setActiveSOS(null)
          Taro.showToast({ title: '已取消求助', icon: 'success' })
        } catch (cancelError) {
          console.error('cancel sos failed', cancelError)
          Taro.showToast({ title: '取消失败，请稍后再试', icon: 'none' })
        }
      },
    })
  }

  return (
    <PageShell roleTone="elder" className="sos-overview-page">
      <HeroHeader
        roleTone="elder"
        eyebrow="紧急求助"
        title="危险时先把求助发出去"
        subtitle="这页只保留最关键的动作，避免紧急时还要在复杂页面里找入口。"
      />

      <ScrollView className="sos-overview-page__scroll" scrollY>
        <SectionBlock title="当前状态" description="先确认今天是否已经有进行中的求助。">
          {loading ? (
            <DataPanel tone="info"><Text className="sos-overview-page__text">正在同步求助状态...</Text></DataPanel>
          ) : activeSOS ? (
            <DataPanel tone="danger">
              <Text className="sos-overview-page__title">求助已发出</Text>
              <Text className="sos-overview-page__text">发起时间：{new Date(activeSOS.triggeredAt).toLocaleString('zh-CN')}</Text>
              <Text className="sos-overview-page__text">家属和照护联系人会优先收到本次提醒。</Text>
              <View className="sos-overview-page__actions">
                <View className="sos-overview-page__button sos-overview-page__button--danger" onClick={handleCancel}><Text>取消本次求助</Text></View>
              </View>
            </DataPanel>
          ) : (
            <EmptyState title="当前没有进行中的求助" description="如果遇到摔倒、胸闷、迷路或其他紧急情况，可以直接发起 SOS。" icon={<Service size={28} />} />
          )}
        </SectionBlock>

        <SectionBlock title="紧急联络" description="把最重要的联系人直接摆在求助页里。">
          {contacts.length === 0 ? (
            <EmptyState title="还没有紧急联系人" description="建议尽快在个人设置里补充家属与照护联系人。" icon={<Warning size={28} />} />
          ) : (
            <View className="sos-overview-page__stack">
              {contacts.map(item => (
                <DataPanel key={item.id} tone={item.canLocate ? 'warning' : 'info'}>
                  <Text className="sos-overview-page__title">{item.name} · {item.relation}</Text>
                  <Text className="sos-overview-page__text">{item.phone}{item.distance ? ` · 距离 ${item.distance}` : ''}</Text>
                  <View className="sos-overview-page__actions">
                    <View className="sos-overview-page__button" onClick={() => Taro.makePhoneCall({ phoneNumber: item.phone })}><Phone size={18} /><Text>立即拨打</Text></View>
                  </View>
                </DataPanel>
              ))}
            </View>
          )}
        </SectionBlock>

        <SectionBlock title="怎么使用" description="把操作缩成三步，适合紧张状态下快速确认。">
          <View className="sos-overview-page__stack">
            <DataPanel tone="warning"><Text className="sos-overview-page__text">1. 点击底部红色按钮，确认发起求助。</Text></DataPanel>
            <DataPanel tone="info"><Text className="sos-overview-page__text">2. 页面会自动同步当前位置并通知家属与照护联系人。</Text></DataPanel>
            <DataPanel tone="success"><Text className="sos-overview-page__text">3. 如已安全，可回到本页取消本次求助。</Text></DataPanel>
          </View>
        </SectionBlock>

        <View className="sos-overview-page__bottom-space" />
      </ScrollView>

      <StickyPrimaryAction tone="elder" label={triggering ? '正在发起求助...' : activeSOS ? '求助已发出，点击查看' : '立即发起 SOS'} icon={<Warning size={22} />} onClick={activeSOS ? handleCancel : handleTrigger} />
    </PageShell>
  )
}
