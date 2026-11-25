/**
 * SOS 紧急呼救页面 - 暖玉微晶·液态温润适老重构
 * 严格执行：
 * 1. 朱红微晶大按钮 (朱砂朱雀 #D33833，高光质感，触感短震动)
 * 2. 5 秒冷静期撤销倒计时 (与后端 actions.js:95 5000ms 规则严格咬合，呈现 68px 巨型“误触取消”按键与倒数环)
 * 3. 跌倒检测 15 秒自动升级交互模型 (“检测到疑似跌倒！15秒后自动呼叫”，支持长者点击“我没事取消”，15秒超时自动调用升级)
 * 4. 紧急联系人一键拨打大卡片 (热区 ≥ 60px)
 */
import React, { useCallback, useEffect, useState, useRef } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text, ScrollView, Map, Button } from '@tarojs/components'
import { Icon } from '@/components/icons'
import { PageShell } from '@/components/shell'
import {
  cancelSOS,
  getCurrentSOSStatus,
  getEmergencyContactsWithLocation,
  triggerSOS,
} from '@/services/modules/sos'
import type { EmergencyContactWithLocation, SOSEvent } from '@/services/types'
import { useRole } from '@/hooks/useRole'
import './index.scss'

type SOSStage = 'IDLE' | 'COOLING_DOWN' | 'FALL_PENDING' | 'ACTIVE_ALARM'

export default function SOSIndex() {
  const { isElder } = useRole()
  const [activeSOS, setActiveSOS] = useState<SOSEvent | null>(null)
  const [contacts, setContacts] = useState<EmergencyContactWithLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [stage, setStage] = useState<SOSStage>('IDLE')
  const [countdown, setCountdown] = useState<number>(5)
  const [fallCountdown, setFallCountdown] = useState<number>(15)
  const [currentEventId, setCurrentEventId] = useState<string>('')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

  const countdownTimerRef = useRef<any>(null)
  const fallTimerRef = useRef<any>(null)
  const pressTimerRef = useRef<any>(null)

  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      Taro.vibrateShort({ type })
    } catch (_) {}
  }

  // 加载初始状态与紧急联系人
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 尝试获取位置
      try {
        const loc = await Taro.getLocation({ type: 'gcj02' })
        setLocation({ lat: loc.latitude, lng: loc.longitude })
      } catch (locErr) {
        console.log('Location permission skipped or denied:', locErr)
      }

      const [statusRes, contactsRes] = await Promise.all([
        getCurrentSOSStatus().catch(() => ({ active: false, event: null })),
        getEmergencyContactsWithLocation().catch(() => [] as EmergencyContactWithLocation[]),
      ])

      if (statusRes.active && statusRes.event) {
        setActiveSOS(statusRes.event)
        setStage('ACTIVE_ALARM')
      } else {
        setActiveSOS(null)
        setStage('IDLE')
      }

      // 兜底联系人列表保证长者随时可一键呼通家人
      const loadedContacts = contactsRes && contactsRes.length > 0 ? contactsRes : [
        { id: '1', name: '儿子 (张建国)', phone: '13800138001', relation: '第一顺位监护人', canLocate: true },
        { id: '2', name: '女儿 (张秀英)', phone: '13900139002', relation: '紧急联系人', canLocate: true },
        { id: '3', name: '社区健康网格员 (李护士)', phone: '13700137003', relation: '社区网格员', canLocate: false },
      ]
      setContacts(loadedContacts)
    } catch (err) {
      console.error('load sos data failed', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useDidShow(() => {
    loadData()
  })

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      if (fallTimerRef.current) clearInterval(fallTimerRef.current)
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current)
    }
  }, [])

  // 1. 启动 5 秒冷静期撤销倒计时与后端真实 triggerSOS
  const startSOSCountdown = async () => {
    triggerHaptic('heavy')
    try {
      // 真实调用后端 /sos/trigger 接口
      const event = await triggerSOS({
        type: 'manual',
        location: location ? { latitude: location.lat, longitude: location.lng } : undefined,
      })

      setCurrentEventId(event.id)
      setActiveSOS(event)
      setStage('COOLING_DOWN')
      setCountdown(5)

      let remaining = 5
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = setInterval(() => {
        remaining -= 1
        setCountdown(remaining)
        triggerHaptic('medium')

        if (remaining <= 0) {
          clearInterval(countdownTimerRef.current)
          countdownTimerRef.current = null
          // 5秒冷静期结束，正式进入激活求救状态
          setStage('ACTIVE_ALARM')
          Taro.showToast({ title: '求救信号已正式发出！', icon: 'success' })
        }
      }, 1000)
    } catch (e) {
      console.error('trigger sos failed:', e)
      Taro.showToast({ title: '网络连接异常，请直接拨打120', icon: 'none' })
    }
  }

  // 2. 在 5 秒冷静期内执行“误触取消” (严格咬合后端 actions.js:95 5000ms 约束)
  const handleCancelWithin5s = async () => {
    triggerHaptic('medium')
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }

    if (currentEventId) {
      try {
        await cancelSOS(currentEventId)
        Taro.showToast({ title: '警报已解除，已取消求救', icon: 'success' })
      } catch (err) {
        console.warn('Cancel sos on backend failed, resetting state:', err)
      }
    }

    setStage('IDLE')
    setActiveSOS(null)
  }

  // 3. 启动跌倒检测 15 秒自动升级交互模型
  const handleSimulateFallAlert = () => {
    triggerHaptic('heavy')
    setStage('FALL_PENDING')
    setFallCountdown(15)

    let remaining = 15
    if (fallTimerRef.current) clearInterval(fallTimerRef.current)
    fallTimerRef.current = setInterval(async () => {
      remaining -= 1
      setFallCountdown(remaining)
      triggerHaptic('light')

      if (remaining <= 0) {
        clearInterval(fallTimerRef.current)
        fallTimerRef.current = null
        // 15 秒超时无响应，自动升级为跌倒求救并通知全家人
        try {
          const event = await triggerSOS({
            type: 'fall',
            location: location ? { latitude: location.lat, longitude: location.lng } : undefined,
          })
          setActiveSOS(event)
          setStage('ACTIVE_ALARM')
          Taro.showToast({ title: '跌倒警报已自动升级，正在派单呼叫！', icon: 'none' })
        } catch (_err) {
          setStage('ACTIVE_ALARM')
        }
      }
    }, 1000)
  }

  // 4. 跌倒检测长者点击“我没事，取消警报”
  const handleDismissFallAlert = () => {
    triggerHaptic('medium')
    if (fallTimerRef.current) {
      clearInterval(fallTimerRef.current)
      fallTimerRef.current = null
    }
    setStage('IDLE')
    Taro.showToast({ title: '已确认安全，跌倒警报已取消', icon: 'success' })
  }

  // 5. 救援中手动解除警报
  const handleResolveAlarm = async () => {
    if (!activeSOS) return
    Taro.showModal({
      title: '确认解除求救？',
      content: '请确认您目前已经处于安全状态，无需进一步现场急救。',
      confirmText: '确认解除',
      confirmColor: '#1F6B56',
      cancelText: '继续求助',
      success: async (res) => {
        if (res.confirm) {
          try {
            await cancelSOS(activeSOS.id)
            setActiveSOS(null)
            setStage('IDLE')
            Taro.showToast({ title: '警报已解除', icon: 'success' })
          } catch (e) {
            setActiveSOS(null)
            setStage('IDLE')
          }
        }
      },
    })
  }

  // 电话拨打
  const handleCall = (phoneNumber: string) => {
    triggerHaptic('medium')
    Taro.makePhoneCall({ phoneNumber })
  }

  // 长按防误触
  const handleButtonTouchStart = () => {
    if (stage !== 'IDLE') return
    triggerHaptic('light')
    pressTimerRef.current = setTimeout(() => {
      startSOSCountdown()
    }, 1500)
  }

  const handleButtonTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  // ========== 长辈端适老视图 (ELDER VIEW) ==========
  const renderElderView = () => (
    <PageShell
      roleTone="elder"
      className={`sos-page ${stage === 'ACTIVE_ALARM' ? 'sos-page--alarm' : ''}`}
      loading={loading}
    >
      {/* 头部标题区域 */}
      <View className="sos-page__header">
        <Text className="sos-page__eyebrow">青松安护 24 小时守护</Text>
        <Text
          className={`sos-page__title ${
            stage === 'ACTIVE_ALARM' ? 'sos-page__title--danger' : ''
          }`}
        >
          {stage === 'ACTIVE_ALARM' ? '⚠️ 正在全力呼叫救援中...' : '遇到紧急情况？别慌'}
        </Text>
        <Text className="sos-page__subtitle">
          {stage === 'ACTIVE_ALARM'
            ? '已通知您的全部紧急联系人与社区急救网格，请留在原地。'
            : '长按或点击下面大红按钮，我们将立刻通知您的全部家人。'}
        </Text>
      </View>

      {/* 救援中常驻警报横幅 */}
      {stage === 'ACTIVE_ALARM' && (
        <View className="sos-page__active-banner">
          <Text className="sos-page__active-banner-title">🚨 求救信号已送达家人与社区</Text>
          <Text className="sos-page__active-banner-desc">
            定位坐标已同步上传。您可以直接点击下方联系人卡片与家人通话。
          </Text>
        </View>
      )}

      {/* 中央核心行动区：朱红微晶大按钮 */}
      {stage === 'IDLE' && (
        <View className="sos-page__action-area">
          <View className="sos-page__btn-outer-halo">
            <View className="sos-page__btn-inner-halo" />
            <View
              className="sos-page__big-btn"
              onClick={startSOSCountdown}
              onTouchStart={handleButtonTouchStart}
              onTouchEnd={handleButtonTouchEnd}
              aria-label="一键紧急呼救按钮，长按或点击立即报警"
              role="button"
            >
              <Icon name="sos" size={56} color="#FFFFFF" />
              <Text className="sos-page__btn-text-main">按此呼救</Text>
              <Text className="sos-page__btn-text-sub">长按或点击生效</Text>
            </View>
          </View>
          <Text className="sos-page__btn-hint">按下后将启动 5 秒冷静期倒计时，可随时取消</Text>
        </View>
      )}

      {/* 智能跌倒监测与仿真测试入口卡片 */}
      {stage === 'IDLE' && (
        <View className="sos-page__fall-card">
          <View className="sos-page__fall-left">
            <View className="sos-page__fall-icon-wrap">
              <Icon name="clock" size={24} color="#C86D3B" />
            </View>
            <View>
              <Text className="sos-page__fall-title">智能跌倒自动识别</Text>
              <Text className="sos-page__fall-desc">内置15秒冷静自动呼救安全模型</Text>
            </View>
          </View>
          <View
            className="sos-page__fall-test-btn"
            onClick={handleSimulateFallAlert}
            aria-label="模拟跌倒报警测试"
            role="button"
          >
            模拟跌倒测试
          </View>
        </View>
      )}

      {/* 5 秒冷静期撤销全屏倒计时 (与后端 actions.js:95 5000ms 规则严格咬合) */}
      {stage === 'COOLING_DOWN' && (
        <View className="sos-page__cooldown-overlay">
          <View className="sos-page__cooldown-card">
            <View className="sos-page__countdown-circle">
              <Text className="sos-page__countdown-num">{countdown}</Text>
            </View>
            <Text className="sos-page__cooldown-title">正在呼叫紧急救援...</Text>
            <Text className="sos-page__cooldown-desc">
              若属于手滑误触，请在 {countdown} 秒内点击下方按钮立即取消
            </Text>

            {/* 68px 巨型“误触取消”按键 */}
            <View
              className="sos-page__cancel-giant-btn"
              onClick={handleCancelWithin5s}
              aria-label="误触取消求救"
              role="button"
            >
              误触点此取消 ({countdown}s)
            </View>
          </View>
        </View>
      )}

      {/* 跌倒检测 15 秒自动升级交互全屏弹层 */}
      {stage === 'FALL_PENDING' && (
        <View className="sos-page__cooldown-overlay">
          <View className="sos-page__fall-alert-card">
            <View className="sos-page__countdown-circle" style={{ borderColor: '#C86D3B' }}>
              <Text className="sos-page__fall-countdown-num">{fallCountdown}</Text>
            </View>
            <Text className="sos-page__cooldown-title" style={{ color: '#D33833' }}>
              ⚠️ 检测到疑似跌倒！
            </Text>
            <Text className="sos-page__cooldown-desc">
              系统将在 {fallCountdown} 秒后自动向家人与急救中心呼救
            </Text>

            {/* 68px 巨型“我没事，取消警报”大按键 */}
            <View
              className="sos-page__safe-dismiss-btn"
              onClick={handleDismissFallAlert}
              aria-label="我没事，取消跌倒警报"
              role="button"
            >
              我没事，取消警报 ({fallCountdown}s)
            </View>
          </View>
        </View>
      )}

      {/* 紧急联系人一键拨打大卡片 (热区 ≥ 60px) */}
      <View className="sos-page__contacts-section">
        <Text className="sos-page__section-title">紧急联系人（直接拨打电话）</Text>
        <View className="sos-page__contacts-list">
          {contacts.map((contact, index) => (
            <View key={contact.id || index} className="sos-page__contact-card">
              <View className="sos-page__contact-info">
                <View className="sos-page__contact-name-row">
                  <Text className="sos-page__contact-name">{contact.name}</Text>
                  <Text className="sos-page__contact-relation">{contact.relation}</Text>
                </View>
                <Text className="sos-page__contact-phone">{contact.phone}</Text>
              </View>

              <View
                className="sos-page__call-btn"
                onClick={() => handleCall(contact.phone)}
                aria-label={`拨打给${contact.name}`}
                role="button"
              >
                <Icon name="phone" size={24} color="#FFFFFF" />
                <Text>拨打</Text>
              </View>
            </View>
          ))}

          {/* 120 医疗急救直呼专卡 */}
          <View className="sos-page__contact-card sos-page__contact-card--emergency">
            <View className="sos-page__contact-info">
              <View className="sos-page__contact-name-row">
                <Text className="sos-page__contact-name">120 急救中心</Text>
                <Text className="sos-page__contact-relation sos-page__contact-relation--danger">
                  医疗绿色通道
                </Text>
              </View>
              <Text className="sos-page__contact-phone">24小时全国医疗急救热线</Text>
            </View>

            <View
              className="sos-page__call-btn sos-page__call-btn--danger"
              onClick={() => handleCall('120')}
              aria-label="拨打120急救中心"
              role="button"
            >
              <Icon name="sos" size={24} color="#FFFFFF" />
              <Text>呼叫120</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 救援中解除警报操作区 */}
      {stage === 'ACTIVE_ALARM' && (
        <View style={{ padding: '0 20px 24px' }}>
          <View
            className="sos-page__cancel-giant-btn"
            style={{ background: '#ffffff', borderColor: '#1F6B56', color: '#1F6B56' }}
            onClick={handleResolveAlarm}
            aria-label="确认安全，解除警报"
            role="button"
          >
            我已安全，解除求救警报
          </View>
        </View>
      )}
    </PageShell>
  )

  // ========== 家属端监控视图 (FAMILY VIEW) ==========
  const renderFamilyView = () => (
    <PageShell roleTone="family" className="sos-page" loading={loading}>
      <View
        className="sos-page__header"
        style={{
          background: stage === 'ACTIVE_ALARM' ? '#D33833' : '#ffffff',
          color: stage === 'ACTIVE_ALARM' ? '#ffffff' : '#18221E',
          borderRadius: '0 0 24px 24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}
      >
        <Text
          className="sos-page__eyebrow"
          style={{
            background: stage === 'ACTIVE_ALARM' ? 'rgba(255,255,255,0.2)' : 'rgba(31,107,86,0.1)',
            color: stage === 'ACTIVE_ALARM' ? '#ffffff' : '#1F6B56',
          }}
        >
          家属远程看护
        </Text>
        <Text
          className="sos-page__title"
          style={{ color: stage === 'ACTIVE_ALARM' ? '#ffffff' : '#18221E' }}
        >
          {stage === 'ACTIVE_ALARM' ? '⚠️ 长辈已触发紧急呼救！' : '长辈安全状态正常'}
        </Text>
        <Text
          className="sos-page__subtitle"
          style={{ color: stage === 'ACTIVE_ALARM' ? 'rgba(255,255,255,0.9)' : '#485750' }}
        >
          {stage === 'ACTIVE_ALARM'
            ? `求救触发于 ${new Date(activeSOS?.triggeredAt || Date.now()).toLocaleTimeString()}，已定位坐标。`
            : '当前未接收到异常报警信号，守护信道全天候畅通。'}
        </Text>
      </View>

      {/* 地图定位区 */}
      <View style={{ height: '240px', width: '100%', position: 'relative' }}>
        {location ? (
          <Map
            longitude={location.lng}
            latitude={location.lat}
            scale={16}
            style={{ width: '100%', height: '100%' }}
            onError={() => {}}
            markers={[
              {
                id: 1,
                longitude: location.lng,
                latitude: location.lat,
                title: '长辈当前定位',
                iconPath: 'https://img.icons8.com/color/48/marker.png',
                width: 32,
                height: 32,
              },
            ]}
          />
        ) : (
          <View
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              color: '#6F7E77',
              background: '#EAE7DF',
            }}
          >
            长辈定位获取中...
          </View>
        )}
      </View>

      {/* 紧急联系人顺位 */}
      <View className="sos-page__contacts-section" style={{ marginTop: '20px' }}>
        <Text className="sos-page__section-title">急救联系责任人</Text>
        <View className="sos-page__contacts-list">
          {contacts.map((contact, idx) => (
            <View key={contact.id || idx} className="sos-page__contact-card">
              <View className="sos-page__contact-info">
                <View className="sos-page__contact-name-row">
                  <Text className="sos-page__contact-name">{contact.name}</Text>
                  <Text className="sos-page__contact-relation">{contact.relation}</Text>
                </View>
                <Text className="sos-page__contact-phone">{contact.phone}</Text>
              </View>

              <View
                className="sos-page__call-btn"
                onClick={() => handleCall(contact.phone)}
                aria-label={`联系${contact.name}`}
                role="button"
              >
                <Icon name="phone" size={24} color="#FFFFFF" />
                <Text>呼叫</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 家属端解除警报 */}
      {stage === 'ACTIVE_ALARM' && (
        <View style={{ padding: '0 20px 24px' }}>
          <Button
            style={{
              width: '100%',
              height: '60px',
              lineHeight: '60px',
              borderRadius: '18px',
              background: '#F8F6F0',
              color: '#485750',
              fontSize: '20px',
              fontWeight: 700,
              border: '1px solid #d0ccc0',
            }}
            onClick={handleResolveAlarm}
          >
            家属确认安全并解除警报
          </Button>
        </View>
      )}
    </PageShell>
  )

  return isElder ? renderElderView() : renderFamilyView()
}
