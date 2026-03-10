import { View, Text, Switch, RadioGroup, Radio, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import './index.scss'

export default function Settings() {
  const [medicationReminder, setMedicationReminder] = useState(true)
  const [sosAlert, setSosAlert] = useState(true)
  const [healthWarning, setHealthWarning] = useState(true)
  const [fontSize, setFontSize] = useState('medium')

  useEffect(() => {
    try {
      const med = Taro.getStorageSync('setting_medicationReminder')
      if (med !== '') setMedicationReminder(med)
      
      const sos = Taro.getStorageSync('setting_sosAlert')
      if (sos !== '') setSosAlert(sos)
      
      const health = Taro.getStorageSync('setting_healthWarning')
      if (health !== '') setHealthWarning(health)
      
      const font = Taro.getStorageSync('fontSize')
      if (font) setFontSize(font)
    } catch (e: unknown) {
      console.error('Failed to load settings', e)
    }
  }, [])

  const handleSwitchChange = (key: string, value: boolean, setter: (val: boolean) => void) => {
    setter(value)
    try {
      Taro.setStorageSync(`setting_${key}`, value)
    } catch (e: unknown) {
      console.error(`Failed to save ${key}`, e)
    }
  }

  const handleFontSizeChange = (e: { detail: { value: string } }) => {
    const val = e.detail.value
    setFontSize(val)
    try {
      Taro.setStorageSync('fontSize', val)
    } catch (err: unknown) {
      console.error('Failed to save font size', err)
    }
  }

  const handleClearCache = () => {
    try {
      Taro.clearStorageSync()
      Taro.showToast({
        title: '缓存已清除',
        icon: 'success',
        duration: 2000
      })
      // Restore default settings after clear
      setMedicationReminder(true)
      setSosAlert(true)
      setHealthWarning(true)
      setFontSize('medium')
    } catch (e: unknown) {
      Taro.showToast({
        title: '清除失败',
        icon: 'error'
      })
    }
  }

  return (
    <View className="settings-page">
      <View className="settings-section">
        <View className="settings-section-title">
          <Text>通知设置</Text>
        </View>
        
        <View className="settings-item">
          <Text className="settings-item-label">用药提醒</Text>
          <Switch 
            checked={medicationReminder} 
            color="#01579b"
            onChange={(e) => handleSwitchChange('medicationReminder', e.detail.value, setMedicationReminder)} 
          />
        </View>
        
        <View className="settings-item">
          <Text className="settings-item-label">SOS告警</Text>
          <Switch 
            checked={sosAlert} 
            color="#01579b"
            onChange={(e) => handleSwitchChange('sosAlert', e.detail.value, setSosAlert)} 
          />
        </View>
        
        <View className="settings-item">
          <Text className="settings-item-label">健康预警</Text>
          <Switch 
            checked={healthWarning} 
            color="#01579b"
            onChange={(e) => handleSwitchChange('healthWarning', e.detail.value, setHealthWarning)} 
          />
        </View>
      </View>

      <View className="settings-section">
        <View className="settings-section-title">
          <Text>字体大小</Text>
        </View>
        <RadioGroup className="font-size-group" onChange={handleFontSizeChange}>
          <View className="radio-item">
            <Radio value="small" checked={fontSize === 'small'} color="#01579b" />
            <Text className="radio-label">小</Text>
          </View>
          <View className="radio-item">
            <Radio value="medium" checked={fontSize === 'medium'} color="#01579b" />
            <Text className="radio-label">中</Text>
          </View>
          <View className="radio-item">
            <Radio value="large" checked={fontSize === 'large'} color="#01579b" />
            <Text className="radio-label">大</Text>
          </View>
        </RadioGroup>
      </View>

      <View className="settings-section">
        <Button className="clear-cache-btn" onClick={handleClearCache}>
          清除缓存
        </Button>
      </View>
    </View>
  )
}
