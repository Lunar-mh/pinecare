import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { get, post, del } from '@/services/request'
import './index.scss'

interface Device {
  id: string
  name: string
  type: string
  status: string
  bindTime: string
}

export default function DeviceBinding() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDevices = async () => {
    setLoading(true)
    try {
      const res = await get('/user/devices') as { data?: Device[] }
      if (res && res.data) {
        setDevices(res.data)
      } else {
        setDevices([])
      }
    } catch (e: unknown) {
      console.error('Failed to fetch devices', e)
      setDevices([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
  }, [])

  const handleScanBind = async () => {
    try {
      const res = await Taro.scanCode({
        onlyFromCamera: false,
        scanType: ['qrCode', 'barCode']
      })
      
      if (res.result) {
        Taro.showLoading({ title: '绑定中...' })
        try {
          await post('/user/devices/bind', { code: res.result })
          Taro.hideLoading()
          Taro.showToast({ title: '绑定成功', icon: 'success' })
          fetchDevices()
        } catch (apiErr: unknown) {
          Taro.hideLoading()
          Taro.showToast({ title: '绑定失败', icon: 'error' })
        }
      }
    } catch (e: unknown) {
      console.error('Scan failed', e)
    }
  }

  const handleUnbind = (id: string, name: string) => {
    Taro.showModal({
      title: '解除绑定',
      content: `确定要解除绑定设备"${name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          Taro.showLoading({ title: '解绑中...' })
          try {
            await del(`/user/devices/${id}`)
            Taro.hideLoading()
            Taro.showToast({ title: '解绑成功', icon: 'success' })
            fetchDevices()
          } catch (e: unknown) {
            Taro.hideLoading()
            Taro.showToast({ title: '解绑失败', icon: 'error' })
          }
        }
      }
    })
  }

  return (
    <View className="device-page">
      <ScrollView scrollY className="device-list">
        {loading ? (
          <View className="empty-state">
            <Text className="empty-text">加载中...</Text>
          </View>
        ) : devices.length > 0 ? (
          devices.map(device => (
            <View key={device.id} className="device-card">
              <View className="device-info">
                <Text className="device-name">{device.name}</Text>
                <Text className="device-type">类型: {device.type}</Text>
                <Text className="device-status">状态: {device.status}</Text>
              </View>
              <Button 
                className="unbind-btn" 
                onClick={() => handleUnbind(device.id, device.name)}
              >
                解绑
              </Button>
            </View>
          ))
        ) : (
          <View className="empty-state">
            <Text className="empty-text">暂未绑定设备</Text>
          </View>
        )}
      </ScrollView>

      <View className="bottom-action">
        <Button className="bind-btn" onClick={handleScanBind}>
          扫码绑定新设备
        </Button>
      </View>
    </View>
  )
}
