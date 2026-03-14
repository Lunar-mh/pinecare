import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { Link, Service } from '@nutui/icons-react-taro'
import { DataPanel, EmptyState, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { get, post } from '@/services/request'
import './index.scss'

type DeviceItem = { id: string; name: string; type: string; status: string; bindTime: string }

export default function DeviceBinding() {
  const [devices, setDevices] = useState<DeviceItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadDevices = async () => {
    setLoading(true)
    try {
      const response = (await get('/device/list')) as { list?: Array<any> }
      const list = (response?.list || []).map((item) => ({
        id: String(item.id || ''),
        name: String(item.deviceName || item.device_name || '未命名设备'),
        type: String(item.deviceType || item.device_type || '智能设备'),
        status: String(item.bindStatus || item.bind_status || '').toLowerCase() === 'bound' ? '在线' : '离线',
        bindTime: String(item.createdAt || item.created_at || new Date().toISOString()),
      }))
      setDevices(list)
    } catch (error) {
      console.error('load devices failed', error)
      setDevices([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDevices() }, [])

  const handleBind = async () => {
    try {
      const result = await Taro.scanCode({ onlyFromCamera: false, scanType: ['qrCode', 'barCode'] })
      if (!result.result) return
      const seed = String(result.result).trim()
      const suffix = seed.slice(-6) || `${Date.now()}`.slice(-6)
      await post('/device/bind', {
        device_name: `智能设备${suffix}`,
        device_mac: `WB${suffix}`.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12),
        device_type: 'wearable',
      })
      Taro.showToast({ title: '设备已绑定', icon: 'success' })
      loadDevices()
    } catch (error) {
      console.error('bind device failed', error)
      Taro.showToast({ title: '绑定失败，请重试', icon: 'none' })
    }
  }

  const handleUnbind = async (id: string) => {
    try {
      await post('/device/unbind', { device_id: Number(id) })
      Taro.showToast({ title: '已解除绑定', icon: 'success' })
      loadDevices()
    } catch (error) {
      console.error('unbind device failed', error)
      Taro.showToast({ title: '操作失败，请稍后再试', icon: 'none' })
    }
  }

  return (
    <PageShell roleTone="family" className="settings-detail-page">
      <HeroHeader roleTone="family" eyebrow="设备与定位" title="设备状态和绑定动作放在一起" subtitle="先看在线状态，再做扫码绑定或解除绑定。" />
      <ScrollView className="detail-shell-scroll" scrollY>
        <SectionBlock title="当前设备" description="只保留设备名称、状态和绑定时间。">
          {loading ? <DataPanel tone="info"><Text className="detail-text">正在同步设备信息...</Text></DataPanel> : devices.length === 0 ? <EmptyState title="还没有绑定设备" description="可以直接使用底部按钮扫码绑定。" icon={<Link size={28} />} /> : <View className="detail-stack">{devices.map(item => <DataPanel key={item.id} tone={item.status.includes('在线') ? 'success' : 'info'}><Text className="detail-title">{item.name}</Text><Text className="detail-text">{item.type} · {item.status}</Text><Text className="detail-meta">绑定时间 {item.bindTime}</Text><View className="detail-actions"><View className="detail-button detail-button--danger" onClick={() => handleUnbind(item.id)}><Text>解除绑定</Text></View></View></DataPanel>)}</View>}
        </SectionBlock>
        <View className="detail-bottom-space" />
      </ScrollView>
      <StickyPrimaryAction tone="family" label="扫码绑定设备" icon={<Link size={22} />} onClick={handleBind} />
    </PageShell>
  )
}
