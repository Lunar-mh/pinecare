import './index.scss'

import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { getTodayMedications, getLatestBloodPressure, getLatestHeartRate } from '@/services'
import type { TodayMedication, BloodPressureRecord, HeartRateRecord } from '@/services/types'
import { Icon, HeartIcon, PillIcon, SosIcon, MicIcon, RobotIcon, FamilyIcon, StethoscopeIcon, UserIcon, ActivityIcon, CheckIcon, ChevronRightIcon } from '@/components/icons'
import { useRole } from '@/hooks/useRole'
import FamilyDashboard from './FamilyDashboard'

interface HealthSummary {
  bloodPressure?: BloodPressureRecord
  heartRate?: HeartRateRecord
}

// 快捷入口（高频 4 项）
const QUICK_ENTRIES = [
  { key: 'health', label: '健康档案', icon: 'heart', color: '#e53935', bg: '#fce4e4', path: '/subpackages/health/pages/index/index' },
  { key: 'medication', label: '用药提醒', icon: 'pill', color: '#fb8c00', bg: '#fff3e0', path: '/subpackages/medication/pages/index/index' },
  { key: 'sos', label: '紧急求助', icon: 'sos', color: '#d32f2f', bg: '#ffebee', path: '/subpackages/sos/pages/index/index' },
  { key: 'voice', label: '语音助手', icon: 'mic', color: '#01579b', bg: '#e3f2fd', path: '/subpackages/voice_ai/pages/index/index' },
]

// 次要功能（3项）
const SECONDARY_ENTRIES = [
  { key: 'ai_companion', label: 'AI陪伴', icon: 'robot', color: '#ad1457', bg: '#fce4ec', path: '/subpackages/ai_companion/pages/index/index' },
  { key: 'family', label: '家庭空间', icon: 'family', color: '#388e3c', bg: '#e8f5e9', path: '/subpackages/family_space/pages/index/index' },
  { key: 'ai_consult', label: 'AI健康顾问', icon: 'stethoscope', color: '#00695c', bg: '#e0f2f1', path: '/subpackages/ai_consult/pages/index/index' },
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
  const { isFamily } = useRole()
  const [health, setHealth] = useState<HealthSummary>({})
  const [todayMeds, setTodayMeds] = useState<TodayMedication[]>([])
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<{ phone?: string; nickname?: string } | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const info = Taro.getStorageSync('userInfo')
      if (info) setUserInfo(JSON.parse(info))
    } catch (_) {}

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

  // 家属端直接渲染 FamilyDashboard
  if (isFamily) {
    return <FamilyDashboard />
  }

  const pendingMeds = todayMeds.filter(m => m.status === 'pending')
  const takenCount = todayMeds.filter(m => m.status === 'taken').length
  const totalCount = todayMeds.length

  const bpStatus = health.bloodPressure?.status
  const hrStatus = health.heartRate?.status

  const userName = userInfo?.phone
    ? `${String(userInfo.phone).slice(0, 3)}****${String(userInfo.phone).slice(-4)}`
    : userInfo?.nickname || '长辈'

  return (
    <View className="home-page">
      {/* ===== 顶部问候区 ===== */}
      <View className="home-header">
        <View className="home-header__top">
          <View>
            <Text className="home-header__greeting">{getGreeting()}，{userName}</Text>
            <Text className="home-header__date">{getDateStr()}</Text>
          </View>
          <View className="home-header__avatar" onClick={() => Taro.switchTab({ url: '/pages/profile/index' })}>
            <UserIcon size={28} color="#fff" />
          </View>
        </View>
      </View>

      {/* ===== 健康摘要卡片 ===== */}
      <View
        className="health-card"
        onClick={() => navigateTo('/subpackages/health/pages/index/index')}
      >
        <View className="health-card__header">
          <Text className="health-card__title">今日健康概览</Text>
          <ChevronRightIcon size={20} color="#999999" />
        </View>

        {loading ? (
          <Text className="health-card__loading">加载中...</Text>
        ) : (
          <View className="health-card__metrics">
            {/* 血压 */}
            <View className="health-metric">
              <View className="health-metric__icon-area">
                <HeartIcon size={24} color="#e53935" />
              </View>
              <View className="health-metric__data">
                <Text className="health-metric__label">血压</Text>
                {health.bloodPressure ? (
                  <Text className="health-metric__value">
                    {health.bloodPressure.systolic}/{health.bloodPressure.diastolic}
                    <Text className="health-metric__unit"> mmHg</Text>
                  </Text>
                ) : (
                  <Text className="health-metric__empty">暂未测量</Text>
                )}
              </View>
              {bpStatus && (
                <View className={`health-metric__badge health-metric__badge--${bpStatus}`}>
                  <Text>{bpStatus === 'normal' ? '正常' : bpStatus === 'warning' ? '偏高' : '危险'}</Text>
                </View>
              )}
            </View>

            <View className="health-metric__divider" />

            {/* 心率 */}
            <View className="health-metric">
              <View className="health-metric__icon-area">
                <ActivityIcon size={24} color="#e53935" />
              </View>
              <View className="health-metric__data">
                <Text className="health-metric__label">心率</Text>
                {health.heartRate ? (
                  <Text className="health-metric__value">
                    {health.heartRate.value}
                    <Text className="health-metric__unit"> 次/分</Text>
                  </Text>
                ) : (
                  <Text className="health-metric__empty">暂未测量</Text>
                )}
              </View>
              {hrStatus && (
                <View className={`health-metric__badge health-metric__badge--${hrStatus}`}>
                  <Text>{hrStatus === 'normal' ? '正常' : hrStatus === 'warning' ? '偏快' : '异常'}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* ===== 用药提醒卡片（有数据才显示）===== */}
      {totalCount > 0 && (
        <View
          className="med-card"
          onClick={() => navigateTo('/subpackages/medication/pages/index/index')}
        >
          <View className="med-card__header">
            <View className="med-card__header-left">
              <PillIcon size={22} color="#fb8c00" />
              <Text className="med-card__title">今日用药</Text>
            </View>
            <View className="med-card__progress-badge">
              <Text className="med-card__progress-text">{takenCount}/{totalCount}</Text>
            </View>
          </View>

          {pendingMeds.length > 0 ? (
            <View className="med-card__list">
              {pendingMeds.slice(0, 2).map(med => (
                <View key={med.medicationId} className="med-item">
                  <Text className="med-item__dot">●</Text>
                  <Text className="med-item__time">{med.time}</Text>
                  <Text className="med-item__name">{med.name}</Text>
                  <Text className="med-item__dosage">{med.dosage}</Text>
                </View>
              ))}
              {pendingMeds.length > 2 && (
                <Text className="med-card__more">还有 {pendingMeds.length - 2} 项待服用 →</Text>
              )}
            </View>
          ) : (
            <View className="med-card__done">
              <CheckIcon size={20} color="#43a047" />
              <Text className="med-card__done-text">今日用药已全部完成！</Text>
            </View>
          )}
        </View>
      )}

      {/* ===== 快捷功能（2×2 大按钮）===== */}
      <View className="section">
        <Text className="section__title">快捷功能</Text>
        <View className="quick-grid">
          {QUICK_ENTRIES.map(entry => (
            <View
              key={entry.key}
              className="quick-item"
              style={{ background: entry.bg }}
              onClick={() => navigateTo(entry.path)}
            >
              <Icon name={entry.icon as 'heart' | 'pill' | 'sos' | 'mic'} size={40} color={entry.color} />
              <Text className="quick-item__label" style={{ color: entry.color }}>{entry.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ===== 更多服务（横向卡片）===== */}
      <View className="section">
        <Text className="section__title">更多服务</Text>
        <View className="secondary-grid">
          {SECONDARY_ENTRIES.map(entry => (
            <View
              key={entry.key}
              className="secondary-item"
              onClick={() => navigateTo(entry.path)}
            >
              <View className="secondary-item__icon-wrap" style={{ background: entry.bg }}>
                <Icon name={entry.icon as 'robot' | 'family' | 'stethoscope'} size={32} color={entry.color} />
              </View>
              <Text className="secondary-item__label">{entry.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ===== 浮动 SOS 按钮 ===== */}
      <View
        className="sos-fab"
        onClick={() => Taro.navigateTo({ url: '/subpackages/sos/pages/index/index' })}
      >
        <SosIcon size={28} color="#fff" />
        <Text className="sos-fab__text">SOS</Text>
      </View>
    </View>
  )
}
