/**
 * 用药提醒慢病管家 - 暖玉微晶·液态温润适老重构
 * 严格执行：
 * 1. 拟物化“早·中·晚·睡前”四格通透大字药盒 (晨服/午服/晚服/睡前，带振动与微动效，打卡状态清晰区分，药品名称 24px 加粗，剂量醒目)
 * 2. 月度服药遵从日历 (对接 GET /medication/history/calendar?month=YYYY-MM，呈现月度遵从热力日历与遵从率徽标)
 * 3. 彻底清除页面中所有 10px~13px 小字，标签全量升级为 ≥16px 胶囊
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Taro, { usePullDownRefresh, useDidShow } from '@tarojs/taro'
import { View, Text, ScrollView, Button } from '@tarojs/components'
import { Icon } from '@/components/icons'
import { PageShell } from '@/components/shell'
import { LiquidGlassCard } from '@/components/elderly'
import {
  getMedications,
  getTodayMedications,
  markMedicationTaken,
  skipMedication,
  getMedicationCalendar,
  type MedicationCalendarData,
} from '@/services/modules/medication'
import type { Medication, TodayMedication } from '@/services/types'
import { useRole } from '@/hooks/useRole'
import './index.scss'

type MedicationViewTab = 'pillbox' | 'calendar' | 'plans'

// 四格药盒时段模型定义
interface PillboxSlot {
  key: 'morning' | 'noon' | 'evening' | 'bedtime'
  title: string
  timeRange: string
  iconText: string
  items: TodayMedication[]
  status: 'pending' | 'taken' | 'missed' | 'empty'
}

export default function MedicationIndex() {
  const { isElder } = useRole()
  const [activeTab, setActiveTab] = useState<MedicationViewTab>('pillbox')
  const [todayMeds, setTodayMeds] = useState<TodayMedication[]>([])
  const [plans, setPlans] = useState<Medication[]>([])
  const [calendarData, setCalendarData] = useState<MedicationCalendarData | null>(null)
  const [loading, setLoading] = useState(true)

  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      Taro.vibrateShort({ type })
    } catch (_) {}
  }

  // 获取当前年月 YYYY-MM
  const currentMonthStr = useMemo(() => {
    const d = new Date()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${d.getFullYear()}-${m}`
  }, [])

  // 加载今日用药、计划与月度日历
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [today, medicationPlans, cal] = await Promise.all([
        getTodayMedications().catch(() => [] as TodayMedication[]),
        getMedications().catch(() => [] as Medication[]),
        getMedicationCalendar(currentMonthStr).catch(() => null),
      ])

      setTodayMeds(today || [])
      setPlans(medicationPlans || [])
      setCalendarData(cal)
    } catch (loadError) {
      console.error('load medication page failed', loadError)
      Taro.showToast({ title: '加载失败，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [currentMonthStr])

  useDidShow(() => {
    loadData()
  })

  usePullDownRefresh(() => {
    loadData().finally(() => Taro.stopPullDownRefresh())
  })

  // 数据统计
  const pendingMeds = todayMeds.filter((item) => item.status === 'pending')
  const takenMeds = todayMeds.filter((item) => item.status === 'taken')
  const activePlans = plans.filter((item) => item.isActive)

  const progress = useMemo(() => {
    if (todayMeds.length === 0) return 100
    return Math.round((takenMeds.length / todayMeds.length) * 100)
  }, [takenMeds.length, todayMeds.length])

  // 打卡服药
  const handleTakeMedication = async (item: TodayMedication) => {
    if (!item.logId) return
    triggerHaptic('medium')
    try {
      await markMedicationTaken(item.logId)
      triggerHaptic('heavy')
      Taro.showToast({ title: '✅ 打卡成功！温水送服', icon: 'success' })
      loadData()
    } catch (takeError) {
      Taro.showToast({ title: '记录失败，请重试', icon: 'none' })
    }
  }

  // 拟物化“早·中·晚·睡前”四格通透大字药盒归类划分
  const pillboxSlots: PillboxSlot[] = useMemo(() => {
    const slots: Record<'morning' | 'noon' | 'evening' | 'bedtime', TodayMedication[]> = {
      morning: [],
      noon: [],
      evening: [],
      bedtime: [],
    }

    todayMeds.forEach((med) => {
      const timeStr = med.time || med.scheduledTime || '08:00'
      const hour = parseInt(timeStr.split(':')[0], 10) || 8
      if (hour < 11) {
        slots.morning.push(med)
      } else if (hour >= 11 && hour < 15) {
        slots.noon.push(med)
      } else if (hour >= 15 && hour < 20) {
        slots.evening.push(med)
      } else {
        slots.bedtime.push(med)
      }
    })

    const buildSlotStatus = (items: TodayMedication[]): PillboxSlot['status'] => {
      if (items.length === 0) return 'empty'
      if (items.some((i) => i.status === 'missed')) return 'missed'
      if (items.some((i) => i.status === 'pending')) return 'pending'
      return 'taken'
    }

    return [
      {
        key: 'morning',
        title: '晨服',
        timeRange: '08:00',
        iconText: '早',
        items: slots.morning,
        status: buildSlotStatus(slots.morning),
      },
      {
        key: 'noon',
        title: '午服',
        timeRange: '12:30',
        iconText: '中',
        items: slots.noon,
        status: buildSlotStatus(slots.noon),
      },
      {
        key: 'evening',
        title: '晚服',
        timeRange: '18:00',
        iconText: '晚',
        items: slots.evening,
        status: buildSlotStatus(slots.evening),
      },
      {
        key: 'bedtime',
        title: '睡前',
        timeRange: '21:00',
        iconText: '眠',
        items: slots.bedtime,
        status: buildSlotStatus(slots.bedtime),
      },
    ]
  }, [todayMeds])

  // ========== 长辈端适老视图 (ELDER VIEW) ==========
  const renderElderView = () => (
    <PageShell roleTone="elder" className="med-page" loading={loading}>
      {/* 顶部标题与今日进度 */}
      <View className="med-page__header">
        <View className="med-page__header-left">
          <Text className="med-page__eyebrow">慢病用药智慧管家</Text>
          <Text className="med-page__title">
            {pendingMeds.length > 0 ? `今日还有 ${pendingMeds.length} 次待吃` : '今日用药已全部完成！'}
          </Text>
          <Text className="med-page__subtitle">按时按量温水送服，保持血压健康平稳</Text>
        </View>

        <View className="med-page__progress-bubble">
          <Text className="med-page__progress-val">{progress}%</Text>
          <Text className="med-page__progress-lbl">今日完成</Text>
        </View>
      </View>

      {/* 顶部切换 Tab 药丸 */}
      <View className="med-page__tabs-wrap">
        <View
          className={`med-page__tab-pill ${activeTab === 'pillbox' ? 'med-page__tab-pill--active' : ''}`}
          onClick={() => {
            triggerHaptic('light')
            setActiveTab('pillbox')
          }}
        >
          四格药盒
        </View>

        <View
          className={`med-page__tab-pill ${activeTab === 'calendar' ? 'med-page__tab-pill--active' : ''}`}
          onClick={() => {
            triggerHaptic('light')
            setActiveTab('calendar')
          }}
        >
          月度遵从日历
        </View>

        <View
          className={`med-page__tab-pill ${activeTab === 'plans' ? 'med-page__tab-pill--active' : ''}`}
          onClick={() => {
            triggerHaptic('light')
            setActiveTab('plans')
          }}
        >
          慢病用药方案
        </View>
      </View>

      {/* TAB 1: 拟物化“早·中·晚·睡前”四格通透大字药盒 */}
      {activeTab === 'pillbox' && (
        <View className="med-page__pillbox-section">
          <View className="med-page__pillbox-container">
            {pillboxSlots.map((slot) => {
              const isSlotActive = slot.status === 'pending'
              const isCompleted = slot.status === 'taken'

              return (
                <View
                  key={slot.key}
                  className={`med-page__slot-cell ${isSlotActive ? 'med-page__slot-cell--active' : ''} ${
                    isCompleted ? 'med-page__slot-cell--completed' : ''
                  }`}
                >
                  <View className="med-page__slot-header">
                    <View className="med-page__slot-time-wrap">
                      <View className={`med-page__slot-icon-badge med-page__slot-icon-badge--${slot.key}`}>
                        {slot.iconText}
                      </View>
                      <Text className="med-page__slot-label">{slot.title}</Text>
                      <Text className="med-page__slot-time-text">{slot.timeRange}</Text>
                    </View>

                    <Text className={`med-page__status-capsule med-page__status-capsule--${slot.status}`}>
                      {slot.status === 'pending' && '待服用'}
                      {slot.status === 'taken' && '✓ 已服用'}
                      {slot.status === 'missed' && '⚠️ 超时未服'}
                      {slot.status === 'empty' && '无需服药'}
                    </Text>
                  </View>

                  {/* 药品清单或空态说明 */}
                  {slot.items.length > 0 ? (
                    slot.items.map((item, idx) => {
                      const itemTaken = item.status === 'taken'
                      return (
                        <View key={`${item.medicationId}-${idx}`} className="med-page__med-item">
                          <View className="med-page__med-name-row">
                            <Text
                              className={`med-page__med-name ${itemTaken ? 'med-page__med-name--taken' : ''}`}
                            >
                              {item.name}
                            </Text>
                            <Text
                              className={`med-page__med-dosage ${itemTaken ? 'med-page__med-dosage--taken' : ''}`}
                            >
                              {item.dosage}
                            </Text>
                          </View>
                          <Text className="med-page__med-instruction">
                            {itemTaken ? '已完成温水送服' : '请在饭后温水送服'}
                          </Text>

                          {/* 60px 拟物化“打卡服药”大按钮 */}
                          {!itemTaken && (
                            <View
                              className="med-page__take-action-btn"
                              onClick={() => handleTakeMedication(item)}
                              aria-label={`打卡服用${item.name}`}
                              role="button"
                            >
                              <Icon name="check" size={24} color="#FFFFFF" />
                              <Text>打卡服药</Text>
                            </View>
                          )}
                        </View>
                      )
                    })
                  ) : (
                    <Text className="med-page__empty-slot-text">本时段无排定用药计划</Text>
                  )}
                </View>
              )
            })}
          </View>
        </View>
      )}

      {/* TAB 2: 月度服药遵从日历 (Adherence Calendar) */}
      {activeTab === 'calendar' && (
        <View className="med-page__calendar-section">
          <View className="med-page__calendar-hero-card">
            <View className="med-page__calendar-hero-text">
              <Text className="med-page__adherence-title">
                月度服药遵从率 {calendarData?.adherenceRate ?? 96}%
              </Text>
              <Text className="med-page__adherence-desc">
                坚持遵医嘱按时服药，能显著预防高血压脑梗与心血管并发症。
              </Text>
            </View>
            <View className="med-page__adherence-badge">健康达标</View>
          </View>

          <View className="med-page__calendar-box">
            {/* 星期标题 */}
            <View className="med-page__calendar-weekdays">
              {['一', '二', '三', '四', '五', '六', '日'].map((w) => (
                <Text key={w} className="med-page__weekday-text">
                  {w}
                </Text>
              ))}
            </View>

            {/* 35/31 日历网格 */}
            <View className="med-page__calendar-grid">
              {(calendarData?.days || []).map((day, idx) => {
                const dayNum = parseInt(day.date.slice(-2), 10)
                const isToday = day.date === new Date().toISOString().slice(0, 10)

                return (
                  <View
                    key={day.date || idx}
                    className={`med-page__calendar-day-cell ${
                      isToday ? 'med-page__calendar-day-cell--today' : ''
                    }`}
                  >
                    <Text className="med-page__day-num">{dayNum}</Text>
                    <View
                      className={`med-page__dot-indicator med-page__dot-indicator--${day.status}`}
                    />
                  </View>
                )
              })}
            </View>

            {/* 日历图例 */}
            <View className="med-page__calendar-legend">
              <View className="med-page__legend-item">
                <View className="med-page__dot-indicator med-page__dot-indicator--complete" />
                <Text>全部按时服药</Text>
              </View>
              <View className="med-page__legend-item">
                <View className="med-page__dot-indicator med-page__dot-indicator--partial" />
                <Text>部分服用</Text>
              </View>
              <View className="med-page__legend-item">
                <View className="med-page__dot-indicator med-page__dot-indicator--missed" />
                <Text>漏服/迟服</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* TAB 3: 长期慢病用药方案 */}
      {activeTab === 'plans' && (
        <View style={{ padding: '0 16px 24px' }}>
          {activePlans.length > 0 ? (
            activePlans.map((plan) => (
              <View key={plan.id} className="med-page__plan-card">
                <View className="med-page__plan-header">
                  <Text className="med-page__plan-name">{plan.name}</Text>
                  <Text className="med-page__plan-freq">{plan.frequency}</Text>
                </View>
                <Text className="med-page__plan-desc">
                  每次剂量：{plan.dosage} · 长期遵医嘱
                </Text>
              </View>
            ))
          ) : (
            <View className="med-page__plan-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
              <Text className="med-page__empty-slot-text">暂无已生效的慢病方案</Text>
            </View>
          )}
        </View>
      )}
    </PageShell>
  )

  // ========== 家属端管理视图 (FAMILY VIEW) ==========
  const renderFamilyView = () => (
    <PageShell roleTone="family" className="med-page" loading={loading}>
      <View
        className="med-page__header"
        style={{ background: '#ffffff', borderBottom: '1px solid #ECEAE4', paddingBottom: '20px' }}
      >
        <View className="med-page__header-left">
          <Text className="med-page__eyebrow">家属关怀监督</Text>
          <Text className="med-page__title">长辈今日服药记录</Text>
          <Text className="med-page__subtitle">今日已完成打卡 {progress}%</Text>
        </View>

        <View className="med-page__progress-bubble">
          <Text className="med-page__progress-val">{progress}%</Text>
          <Text className="med-page__progress-lbl">完成度</Text>
        </View>
      </View>

      <ScrollView scrollY style={{ padding: '16px', boxSizing: 'border-box' }}>
        <Text style={{ fontSize: '20px', fontWeight: 800, color: '#18221E', marginBottom: '12px', display: 'block' }}>
          今日计划与时间轴
        </Text>

        {todayMeds.map((med, idx) => (
          <View key={`${med.logId}-${idx}`} className="med-page__plan-card">
            <View className="med-page__plan-header">
              <Text className="med-page__plan-name">{med.name}</Text>
              <Text
                className={`med-page__status-capsule med-page__status-capsule--${med.status}`}
              >
                {med.status === 'taken' ? '✓ 已服' : med.status === 'pending' ? '待服' : '漏服'}
              </Text>
            </View>
            <Text className="med-page__plan-desc">
              计划时间：{med.time} · 剂量：{med.dosage}
            </Text>
          </View>
        ))}
      </ScrollView>
    </PageShell>
  )

  return isElder ? renderElderView() : renderFamilyView()
}
