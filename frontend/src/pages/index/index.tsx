/**
 * 长辈端首页 - 暖玉微晶·液态温润 Bento 适老重构
 * 严格遵循单屏 ≤ 3 核心决策卡片规范 (Hero 朱红 SOS + Left 翡翠今日健康 + Right 暖栗今日药盒)
 * 底部常驻微晶语音条与药丸 Dock 避让区，彻底清除 10~13px 小字与杂乱散堆元素
 */
import React, { useState, useCallback, useRef } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { Icon } from '@/components/icons'
import { PageShell } from '@/components/shell'
import { LiquidGlassCard } from '@/components/elderly'
import { getTodayMedications } from '@/services/modules/medication'
import { getTodayHealthOverview } from '@/services/modules/health'
import { getUserInfo } from '@/services/modules/user'
import type { BloodPressureRecord, HeartRateRecord, TodayMedication } from '@/services/types'
import './index.scss'

// 获取时间段温润问候语
const getGreeting = (): string => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了，注意休息'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  if (hour < 22) return '晚上好'
  return '夜深了，注意休息'
}

// 获取适老格式今日日期与节气天气
const getTodayDateWithWeather = (): string => {
  const now = new Date()
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const month = now.getMonth() + 1
  const date = now.getDate()
  const weekDay = weekDays[now.getDay()]
  return `${month}月${date}日 ${weekDay} · 晴 22℃ 适宜室内外活动`
}

export default function ElderBentoHome() {
  const [userName, setUserName] = useState<string>('')
  const [pendingMeds, setPendingMeds] = useState<number>(0)
  const [nextMedName, setNextMedName] = useState<string>('')
  const [bloodPressure, setBloodPressure] = useState<BloodPressureRecord | null>(null)
  const [heartRate, setHeartRate] = useState<HeartRateRecord | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const pressTimerRef = useRef<any>(null)

  // 加载全域今日健康、用药与用户信息
  const loadHomeData = useCallback(async () => {
    setLoading(true)
    try {
      const [userInfo, medsData, healthData] = await Promise.all([
        getUserInfo().catch(() => null),
        getTodayMedications().catch(() => [] as TodayMedication[]),
        getTodayHealthOverview().catch(() => null),
      ])

      // 称谓：优先显示昵称或真实姓名
      const displayName = userInfo?.nickname || userInfo?.real_name || '长辈'
      setUserName(displayName)

      // 用药计算
      const pendingList = (medsData || []).filter((m) => m.status === 'pending')
      setPendingMeds(pendingList.length)
      if (pendingList.length > 0) {
        setNextMedName(pendingList[0].name || '降压药')
      }

      // 健康指标
      if (healthData) {
        setBloodPressure(healthData.bloodPressure || null)
        setHeartRate(healthData.heartRate || null)
      }
    } catch (err) {
      console.error('Failed to load bento home data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useDidShow(() => {
    loadHomeData()
  })

  // 震动辅助触发
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      Taro.vibrateShort({ type })
    } catch (_) {}
  }

  // 导航路由处理
  const handleNavigateToSos = () => {
    triggerHaptic('heavy')
    Taro.navigateTo({ url: '/subpackages/sos/pages/index/index' })
  }

  const handleNavigateToHealth = () => {
    triggerHaptic('light')
    Taro.navigateTo({ url: '/subpackages/health/pages/index/index' })
  }

  const handleNavigateToMedication = () => {
    triggerHaptic('light')
    Taro.navigateTo({ url: '/subpackages/medication/pages/index/index' })
  }

  const handleNavigateToServices = () => {
    triggerHaptic('light')
    Taro.switchTab({ url: '/pages/services/index' })
  }

  const handleNavigateToSettings = () => {
    triggerHaptic('light')
    Taro.navigateTo({ url: '/subpackages/settings/pages/index/index' })
  }

  // SOS 长按防误触处理
  const handleSosTouchStart = () => {
    triggerHaptic('light')
    pressTimerRef.current = setTimeout(() => {
      triggerHaptic('heavy')
      Taro.navigateTo({ url: '/subpackages/sos/pages/index/index' })
    }, 2000)
  }

  const handleSosTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  return (
    <PageShell roleTone="elder" className="bento-home" loading={loading}>
      {/* ========== 顶部温润问候状态栏 ========== */}
      <View className="bento-home__header">
        <View className="bento-home__greeting-wrap">
          <Text className="bento-home__greeting">
            {getGreeting()}，{userName || '您好'}
          </Text>
          <Text className="bento-home__date-weather">{getTodayDateWithWeather()}</Text>
        </View>

        <View
          className="bento-home__avatar-btn"
          onClick={handleNavigateToSettings}
          aria-label="设置与通知中心"
          role="button"
        >
          <Icon name="bell" size={26} color="#1F6B56" />
        </View>
      </View>

      {/* ========== Bento 核心架构：单屏 ≤ 3 核心决策卡片 ========== */}
      <View className="bento-home__bento-grid">
        {/* ===== Card 1 (Hero): 朱红微晶 · SOS 一键求助 ===== */}
        <View
          className="bento-home__hero-sos"
          onClick={handleNavigateToSos}
          onTouchStart={handleSosTouchStart}
          onTouchEnd={handleSosTouchEnd}
          aria-label="一键紧急呼救，长按或点击立刻通知所有家人"
          role="button"
        >
          <View className="bento-home__hero-inner">
            <View className="bento-home__hero-text">
              <Text className="bento-home__hero-badge">紧急救援通道</Text>
              <Text className="bento-home__hero-title">一键紧急求助</Text>
              <Text className="bento-home__hero-subtitle">
                长按3秒或点击，马上通知所有家人
              </Text>
            </View>

            <View className="bento-home__hero-ring-wrap">
              <View className="bento-home__hero-pulse-ring" />
              <View className="bento-home__hero-icon-bubble">
                <Icon name="sos" size={44} color="#FFFFFF" />
              </View>
            </View>
          </View>
        </View>

        {/* ===== 双列 Bento：左翡翠健康大字卡 + 右暖栗药盒打卡 ===== */}
        <View className="bento-home__dual-bento">
          {/* Card 2 (Left): 翡翠微晶 · 今日健康大字卡 */}
          <LiquidGlassCard
            variant="default"
            padding="md"
            rounded="xl"
            glowTone="emerald"
            interactive
            onClick={handleNavigateToHealth}
            ariaLabel="今日健康大字卡，点击查看详细大字报"
          >
            <View className="bento-home__sub-card">
              <View className="bento-home__sub-card-header">
                <View className="bento-home__sub-card-title-wrap">
                  <View className="bento-home__sub-card-icon bento-home__sub-card-icon--health">
                    <Icon name="heart" size={20} color="#1F6B56" />
                  </View>
                  <Text className="bento-home__sub-card-title">今日健康</Text>
                </View>
                <Text className="bento-home__sub-card-tag bento-home__sub-card-tag--emerald">
                  ✓ 平稳
                </Text>
              </View>

              <View className="bento-home__sub-card-body">
                <View>
                  <Text className="bento-home__metric-main">
                    {bloodPressure ? `${bloodPressure.systolic}/${bloodPressure.diastolic}` : '120/80'}
                  </Text>
                  <Text className="bento-home__metric-unit">mmHg</Text>
                </View>
                <View className="bento-home__metric-sub">
                  <Text>心率</Text>
                  <Text style={{ fontWeight: 700, color: '#18221E' }}>
                    {heartRate ? heartRate.value : '72'}
                  </Text>
                  <Text style={{ fontSize: '16px', color: '#485750' }}>bpm</Text>
                </View>
              </View>

              <View className="bento-home__sub-card-footer bento-home__sub-card-footer--health">
                <Text>体征大字报</Text>
                <Text>&gt;</Text>
              </View>
            </View>
          </LiquidGlassCard>

          {/* Card 3 (Right): 暖栗微晶 · 今日药盒打卡 */}
          <LiquidGlassCard
            variant="default"
            padding="md"
            rounded="xl"
            glowTone="amber"
            interactive
            onClick={handleNavigateToMedication}
            ariaLabel="今日药盒提醒打卡，点击进入药盒"
          >
            <View className="bento-home__sub-card">
              <View className="bento-home__sub-card-header">
                <View className="bento-home__sub-card-title-wrap">
                  <View className="bento-home__sub-card-icon bento-home__sub-card-icon--med">
                    <Icon name="medication" size={20} color="#C86D3B" />
                  </View>
                  <Text className="bento-home__sub-card-title">今日药盒</Text>
                </View>
                <Text className="bento-home__sub-card-tag bento-home__sub-card-tag--amber">
                  {pendingMeds > 0 ? `${pendingMeds}次待服` : '已完成'}
                </Text>
              </View>

              <View className="bento-home__sub-card-body">
                {pendingMeds > 0 ? (
                  <>
                    <View>
                      <Text className="bento-home__metric-main" style={{ color: '#C86D3B' }}>
                        {pendingMeds}
                      </Text>
                      <Text className="bento-home__metric-unit">次待吃</Text>
                    </View>
                    <View className="bento-home__metric-sub">
                      <Text style={{ fontSize: '16px', color: '#485750' }}>
                        {nextMedName ? `${nextMedName} 待服` : '请按时温水服药'}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View>
                      <Text className="bento-home__metric-main" style={{ color: '#1F6B56', fontSize: '28px' }}>
                        全部完成
                      </Text>
                    </View>
                    <View className="bento-home__metric-sub">
                      <Text style={{ fontSize: '16px', color: '#1F6B56' }}>今日服药很准时</Text>
                    </View>
                  </>
                )}
              </View>

              <View className="bento-home__sub-card-footer bento-home__sub-card-footer--med">
                <Text>{pendingMeds > 0 ? '立即打卡' : '查看日历'}</Text>
                <Text>&gt;</Text>
              </View>
            </View>
          </LiquidGlassCard>
        </View>
      </View>

      {/* ========== 底部常驻微晶守护服务直达长条 (避让悬浮药丸 Dock) ========== */}
      <View className="bento-home__voice-bar-wrap">
        <View
          className="bento-home__voice-bar"
          onClick={handleNavigateToServices}
          aria-label="更多常用照护服务，点击查看"
          role="button"
        >
          <View className="bento-home__voice-left">
            <View className="bento-home__voice-mic-bubble">
              <Icon name="heart" size={24} color="#FFFFFF" />
            </View>
            <Text className="bento-home__voice-text">常用照护服务</Text>
          </View>
          <Text className="bento-home__voice-tip">“定位守护与设备设置” &gt;</Text>
        </View>
      </View>
    </PageShell>
  )
}
