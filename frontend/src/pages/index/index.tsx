import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useCallback, useMemo, useState, useEffect } from 'react'
import { getTodayHealthOverview, getTodayMedications } from '@/services'
import type { TodayHealthOverview, TodayMedication } from '@/services/types'
import { Icon, UserIcon, SosIcon } from '@/components/icons'
import { ActionGrid, DataPanel, HeroHeader, PageShell, SectionBlock, StatusCard, StickyPrimaryAction } from '@/components/shell'
import { homeQuickActionsByRole, serviceClustersByRole } from '@/design/navigation'
import { buildHealthSummaryCards, getDateLabel, getGreetingText, maskDisplayName } from '@/view-models/dashboard'
import { useRole } from '@/hooks/useRole'
import FamilyDashboard from './FamilyDashboard'
import VoiceAssistant from '@/components/VoiceAssistant'
import './index.scss'

export default function IndexPage() {
  const { isFamily } = useRole()
  const [health, setHealth] = useState<TodayHealthOverview>({ alerts: [], recordsCount: 0 })
  const [todayMeds, setTodayMeds] = useState<TodayMedication[]>([])
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<{ phone?: string; nickname?: string } | null>(null)
  const [voiceActive, setVoiceActive] = useState(false)
  const [sosCountdown, setSosCountdown] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const info = Taro.getStorageSync('userInfo')
      if (info) {
        setUserInfo(JSON.parse(info) as { phone?: string; nickname?: string })
      }
    } catch (_) {
      setUserInfo(null)
    }

    try {
      const [medsRes, healthRes] = await Promise.allSettled([
        getTodayMedications(),
        getTodayHealthOverview(),
      ])

      if (medsRes.status === 'fulfilled') {
        setTodayMeds(medsRes.value || [])
      } else {
        setTodayMeds([])
      }

      setHealth(healthRes.status === 'fulfilled' ? healthRes.value : { alerts: [], recordsCount: 0 })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sosCountdown > 0) {
      const timer = setTimeout(() => setSosCountdown(sosCountdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (sosCountdown === 0 && sosCountdown !== null) {
      // 倒计时结束，真正触发
    }
  }, [sosCountdown])

  useLoad(() => {
    loadData()
  })

  if (isFamily) {
    return <FamilyDashboard />
  }

  const handleSos = () => {
    Taro.vibrateLong()
    setSosCountdown(5)
    Taro.showToast({ title: '紧急求助准备中', icon: 'none' })
  }

  const cancelSos = () => {
    setSosCountdown(0)
    Taro.showToast({ title: '已取消求助', icon: 'none' })
  }

  useEffect(() => {
    if (sosCountdown === 1) {
      const finalTimer = setTimeout(() => {
        setSosCountdown(0)
        // 真实触发 SOS 接口
        Taro.navigateTo({ url: '/subpackages/sos/pages/index/index?trigger=auto' })
      }, 1000)
      return () => clearTimeout(finalTimer)
    }
  }, [sosCountdown])

  const toggleVoice = () => {
    setVoiceActive(!voiceActive)
    if (!voiceActive) {
      Taro.vibrateShort()
      Taro.showToast({ title: '语音助手已启动', icon: 'none' })
    }
  }

  // ... (rest of navigateByPath)

  return (
    <PageShell roleTone="elder" className="home-dashboard-luxe" loading={loading}>
      <View className="ambient-glow" style={{ opacity: health.alerts.length > 0 ? 0.4 : 0.1 }} />
      
      <HeroHeader
        roleTone="elder"
        eyebrow={`${getGreetingText()}，${maskDisplayName(userInfo)}`}
        title="曜银·全时安全守护"
        subtitle="系统正在后台实时扫描您的生理体征。"
        aside={
          <View 
            className="avatar-neo" 
            onClick={toggleVoice}
            role="button"
            aria-label="唤醒小银助手"
          >
            <UserIcon size={24} color={voiceActive ? "#2D5AEE" : "#666"} />
            {voiceActive && <View className="voice-wave-min" />}
          </View>
        }
      />

      <SectionBlock title="实时态势感知" description="通过 IoT 设备同步的核心健康闭环。">
        <View className="bento-grid-neo">
          {summaryCards.map((card, idx) => (
            <StatusCard 
              key={card.key} 
              {...card} 
              className={`animate-pop-in delay-${idx}`} 
            />
          ))}
        </View>
      </SectionBlock>

      <SectionBlock title="灵动服务舱" description="一键触达，极致简化的操作体验。">
        <ActionGrid
          items={quickActions.map(item => ({
            ...item,
            icon: <View className="icon-neo-wrapper"><Icon name={item.icon} size={32} color="#2D5AEE" /></View>
          }))}
          onSelect={(key) => {
            const target = quickActions.find(item => item.key === key)
            if (target) navigateByPath(target.path)
          }}
        />
      </SectionBlock>

      <View className="sos-container-neo">
        <View 
          className={classNames('sos-button-neo', { 'is-active': sosCountdown > 0 })}
          onClick={sosCountdown > 0 ? cancelSos : handleSos}
        >
          <View className="sos-rings">
            <View className="ring r1" />
            <View className="ring r2" />
          </View>
          <View className="sos-content">
            <SosIcon size={32} color="#fff" />
            <Text className="sos-label">
              {sosCountdown > 0 ? `撤回 (${sosCountdown}s)` : "紧急求助"}
            </Text>
          </View>
        </View>
      </View>

      <VoiceAssistant active={voiceActive} text={voiceActive ? "我在听，请吩咐..." : ""} />
    </PageShell>
  )
}
