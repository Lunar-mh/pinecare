import './index.scss'

import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { Heart, Clock, Warning, Tips, User, Order, Transit, Phone, Checked } from '@nutui/icons-react-taro'
import { getTodayMedications, getLatestBloodPressure, getLatestHeartRate } from '@/services'
import type { TodayMedication, BloodPressureRecord, HeartRateRecord } from '@/services/types'

interface HealthSummary {
  bloodPressure?: BloodPressureRecord
  heartRate?: HeartRateRecord
}

const MODULE_LIST = [
  { key: 'health', label: '健康档案', icon: Heart, color: '#e53935', bg: '#fce4e4', path: '/subpackages/health/pages/index/index' },
  { key: 'medication', label: '用药提醒', icon: Clock, color: '#fb8c00', bg: '#fff3e0', path: '/subpackages/medication/pages/index/index' },
  { key: 'sos', label: '紧急求助', icon: Warning, color: '#d32f2f', bg: '#ffebee', path: '/subpackages/sos/pages/index/index' },
  { key: 'voice', label: '语音助手', icon: Tips, color: '#01579b', bg: '#e3f2fd', path: '/subpackages/voice_ai/pages/index/index' },
  { key: 'family', label: '家庭空间', icon: User, color: '#388e3c', bg: '#e8f5e9', path: '/subpackages/family_space/pages/index/index' },
  { key: 'timebank', label: '时间银行', icon: Order, color: '#6a1b9a', bg: '#f3e5f5', path: '/subpackages/timebank/pages/index/index' },
  { key: 'location', label: '位置安全', icon: Transit, color: '#00838f', bg: '#e0f7fa', path: '/subpackages/location/pages/index/index' },
  { key: 'medical', label: '医疗服务', icon: Phone, color: '#2e7d32', bg: '#e8f5e9', path: '/subpackages/medical/pages/index/index' },
  { key: 'ai_consult', label: 'AI健康顾问', icon: Tips, color: '#00695c', bg: '#e0f2f1', path: '/subpackages/ai_consult/pages/index/index' },
  { key: 'drug_check', label: '用药安全', icon: Checked, color: '#6a1b9a', bg: '#f3e5f5', path: '/subpackages/drug_check/pages/index/index' },
  { key: 'ai_companion', label: 'AI陪伴', icon: Heart, color: '#ad1457', bg: '#fce4ec', path: '/subpackages/ai_companion/pages/index/index' },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了，注意休息'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

function getDateStr(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const d = now.getDate()
  const weeks = ['日', '一', '二', '三', '四', '五', '六']
  const w = weeks[now.getDay()]
  return `${y}年${m}月${d}日 星期${w}`
}

export default function Index() {
  const [health, setHealth] = useState<HealthSummary>({})
  const [todayMeds, setTodayMeds] = useState<TodayMedication[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [medsRes, bpRes, hrRes] = await Promise.allSettled([
        getTodayMedications(),
        getLatestBloodPressure(),
        getLatestHeartRate(),
      ])
      if (medsRes.status === 'fulfilled') setTodayMeds(medsRes.value || [])
      const bp = bpRes.status === 'fulfilled' ? bpRes.value : undefined
      const hr = hrRes.status === 'fulfilled' ? hrRes.value : undefined
      setHealth({
        bloodPressure: bp ?? undefined,
        heartRate: hr ?? undefined,
      })
    } catch (_) {
      // 静默失败，页面保持可用
    } finally {
      setLoading(false)
    }
  }, [])

  useLoad(() => { loadData() })

  const navigateTo = (path: string) => Taro.navigateTo({ url: path })

  const pendingMeds = todayMeds.filter(m => m.status === 'pending')
  const takenCount = todayMeds.filter(m => m.status === 'taken').length
  const totalCount = todayMeds.length

  const bpStatus = health.bloodPressure?.status
  const hrStatus = health.heartRate?.status

  return (
    <View className="home-page">
      {/* 问候头部 */}
      <View className="home-header">
        <View className="home-header__greeting">
          <Text className="home-header__hello">{getGreeting()}，</Text>
          <Text className="home-header__name">长辈</Text>
        </View>
        <Text className="home-header__date">{getDateStr()}</Text>
      </View>

      {/* 健康摘要卡片 */}
      <View className="health-summary-card" onClick={() => navigateTo('/subpackages/health/pages/index/index')}>
        <Text className="health-summary-card__title">今日健康</Text>
        <View className="health-summary-card__metrics">
          <View className="health-metric">
            <View className="health-metric__icon-wrap" style={{ background: '#fce4e4' }}>
              <Heart size={20} color="#e53935" />
            </View>
            <View className="health-metric__info">
              <Text className="health-metric__label">血压</Text>
              {health.bloodPressure ? (
                <Text className="health-metric__value">
                  {health.bloodPressure.systolic}/{health.bloodPressure.diastolic}
                  <Text className="health-metric__unit"> mmHg</Text>
                </Text>
              ) : (
                <Text className="health-metric__value health-metric__value--empty">未测量</Text>
              )}
            </View>
            {bpStatus && (
              <View className={`health-metric__badge health-metric__badge--${bpStatus}`}>
                <Text>{bpStatus === 'normal' ? '正常' : bpStatus === 'warning' ? '偏高' : '危险'}</Text>
              </View>
            )}
          </View>

          <View className="health-metric__divider" />

          <View className="health-metric">
            <View className="health-metric__icon-wrap" style={{ background: '#ffebee' }}>
              <Heart size={20} color="#d32f2f" />
            </View>
            <View className="health-metric__info">
              <Text className="health-metric__label">心率</Text>
              {health.heartRate ? (
                <Text className="health-metric__value">
                  {health.heartRate.value}
                  <Text className="health-metric__unit"> 次/分</Text>
                </Text>
              ) : (
                <Text className="health-metric__value health-metric__value--empty">未测量</Text>
              )}
            </View>
            {hrStatus && (
              <View className={`health-metric__badge health-metric__badge--${hrStatus}`}>
                <Text>{hrStatus === 'normal' ? '正常' : hrStatus === 'warning' ? '偏快' : '异常'}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* 用药提醒卡片 */}
      {totalCount > 0 && (
        <View className="medication-card" onClick={() => navigateTo('/subpackages/medication/pages/index/index')}>
          <View className="medication-card__header">
            <View className="medication-card__header-left">
              <View className="medication-card__icon-wrap">
                <Clock size={20} color="#fb8c00" />
              </View>
              <Text className="medication-card__title">今日用药</Text>
            </View>
            <Text className="medication-card__progress">{takenCount}/{totalCount}</Text>
          </View>
          {pendingMeds.length > 0 ? (
            <View className="medication-card__list">
              {pendingMeds.slice(0, 2).map(med => (
                <View key={med.medicationId} className="medication-card__item">
                  <Text className="medication-card__time">{med.time}</Text>
                  <Text className="medication-card__name">{med.name}</Text>
                  <Text className="medication-card__dosage">{med.dosage}</Text>
                </View>
              ))}
              {pendingMeds.length > 2 && (
                <Text className="medication-card__more">还有 {pendingMeds.length - 2} 项待服用...</Text>
              )}
            </View>
          ) : (
            <View className="medication-card__done">
              <Text className="medication-card__done-text">今日用药已全部完成 ✓</Text>
            </View>
          )}
        </View>
      )}

      {/* 8模块功能网格 */}
      <View className="modules-section">
        <Text className="modules-section__title">功能导航</Text>
        <View className="modules-grid">
          {MODULE_LIST.map(mod => {
            const IconComp = mod.icon
            return (
              <View
                key={mod.key}
                className="module-item"
                onClick={() => navigateTo(mod.path)}
              >
                <View className="module-item__icon-wrap" style={{ background: mod.bg }}>
                  <IconComp size={28} color={mod.color} />
                </View>
                <Text className="module-item__label">{mod.label}</Text>
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}
