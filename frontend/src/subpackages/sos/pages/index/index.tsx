import { useCallback, useEffect, useState } from 'react'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { Phone, Service, Warning } from '@nutui/icons-react-taro'
import {
  DataPanel,
  EmptyState,
  HeroHeader,
  PageShell,
  SectionBlock,
  StickyPrimaryAction,
} from '@/components/shell'
import {
  cancelSOS,
  getCurrentSOSStatus,
  getEmergencyContactsWithLocation,
  triggerSOS,
} from '@/services/modules/sos'
import { getElderlyOverview } from '@/services/modules/family'
import type { ElderlyOverview, EmergencyContactWithLocation, SOSEvent } from '@/services/types'
import { useRole } from '@/hooks/useRole'
import { Icon } from '@/components/icons'
import './index.scss'

export default function SOSIndex() {
  const { isFamily } = useRole()
  const [activeSOS, setActiveSOS] = useState<SOSEvent | null>(null)
  const [contacts, setContacts] = useState<EmergencyContactWithLocation[]>([])
  const [overview, setOverview] = useState<ElderlyOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (isFamily) {
        const data = await getElderlyOverview()
        setOverview(data)
        setActiveSOS(null)
        setContacts([])
        return
      }

      const [status, contactList] = await Promise.all([
        getCurrentSOSStatus(),
        getEmergencyContactsWithLocation(),
      ])
      setActiveSOS(status.active && status.event ? status.event : null)
      setContacts(contactList || [])
      setOverview(null)
    } catch (loadError) {
      console.error('load sos page failed', loadError)
      if (isFamily) {
        setOverview(null)
      } else {
        setActiveSOS(null)
        setContacts([])
      }
    } finally {
      setLoading(false)
    }
  }, [isFamily])

  useLoad(() => {
    loadData()
  })

  useDidShow(() => {
    loadData()
  })

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
          setActiveSOS(event)
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

  if (isFamily) {
    const sosAlerts = overview?.alerts.filter(item => item.type === 'sos').slice(0, 3) || []

    return (
      <PageShell roleTone="family" className="sos-overview-page">
        <HeroHeader
          roleTone="family"
          eyebrow={overview ? `${overview.name} · 家属风险视角` : '家属 SOS 视角'}
          title="先确认长辈是否处于紧急状态"
          subtitle="如果首页已有 SOS 提醒，这里优先聚合风险信息和最近位置。"
          aside={<View className="sos-overview-page__family-badge"><Icon name="sos" size={20} color="#fff" /></View>}
        />

        <ScrollView className="sos-overview-page__scroll" scrollY>
          <SectionBlock title="当前风险" description="把长辈最需要先处理的提醒放在前面。">
            {loading ? (
              <DataPanel tone="info"><Text className="sos-overview-page__text">正在同步长辈 SOS 风险...</Text></DataPanel>
            ) : sosAlerts.length > 0 ? (
              <View className="sos-overview-page__stack">
                {sosAlerts.map(item => (
                  <DataPanel key={item.id} tone="danger">
                    <Text className="sos-overview-page__title">{item.title}</Text>
                    <Text className="sos-overview-page__text">{item.message}</Text>
                    <Text className="sos-overview-page__text">触发时间：{new Date(item.createdAt).toLocaleString('zh-CN')}</Text>
                  </DataPanel>
                ))}
              </View>
            ) : (
              <EmptyState title="当前没有进行中的 SOS 提醒" description="如果后台已确认或解决事件，这里会在重新进入页面时同步刷新。" icon={<Service size={28} />} />
            )}
          </SectionBlock>

          <SectionBlock title="最近位置" description="紧急情况下先确认长辈最近一次位置。">
            <DataPanel tone={overview?.location ? 'warning' : 'info'}>
              <Text className="sos-overview-page__title">{overview?.location?.address || '暂未获取到长辈位置'}</Text>
              <Text className="sos-overview-page__text">
                {overview?.location ? `更新时间：${overview.location.updatedAt}` : '建议先检查定位共享和设备在线状态。'}
              </Text>
            </DataPanel>
          </SectionBlock>

          <SectionBlock title="处理建议" description="家属端聚焦确认、联络与定位，不承担后台处置流。">
            <View className="sos-overview-page__stack">
              <DataPanel tone="warning"><Text className="sos-overview-page__text">1. 先联系长辈，确认是否为真实紧急事件。</Text></DataPanel>
              <DataPanel tone="info"><Text className="sos-overview-page__text">2. 再查看定位页，判断是否需要联系社区或线下救助。</Text></DataPanel>
              <DataPanel tone="success"><Text className="sos-overview-page__text">3. 后台完成确认或解决后，这里会同步消除进行中提醒。</Text></DataPanel>
            </View>
          </SectionBlock>

          <View className="sos-overview-page__bottom-space" />
        </ScrollView>

        <StickyPrimaryAction
          tone="family"
          label="查看实时定位"
          icon={<Icon name="location" size={20} color="#fff" />}
          onClick={() => Taro.navigateTo({ url: '/subpackages/location/pages/index/index' })}
        />
      </PageShell>
    )
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
              <Text className="sos-overview-page__text">
                {activeSOS.status === 'confirmed' ? '社区或家属已确认事件，等待处理闭环。' : '家属和照护联系人会优先收到本次提醒。'}
              </Text>
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

      <StickyPrimaryAction
        tone="elder"
        label={triggering ? '正在发起求助...' : activeSOS ? '取消本次 SOS' : '立即发起 SOS'}
        icon={<Warning size={22} />}
        onClick={activeSOS ? handleCancel : handleTrigger}
      />
    </PageShell>
  )
}
