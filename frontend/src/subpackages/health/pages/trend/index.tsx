import './index.scss'

import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { Heart, ArrowRight } from '@nutui/icons-react-taro'
import { getBloodPressureTrend, getHeartRateTrend } from '@/services'

type Period = 7 | 30

interface BPTrend {
  dates: string[]
  systolic: number[]
  diastolic: number[]
}

interface HRTrend {
  dates: string[]
  values: number[]
}

function formatDateLabel(dateStr: string, period: Period): string {
  const d = new Date(dateStr)
  if (period === 7) {
    return `${d.getMonth() + 1}/${d.getDate()}`
  }
  return `${d.getDate()}日`
}

function getBarHeightPercent(value: number, maxVal: number, minBar = 5): number {
  if (maxVal === 0) return minBar
  return Math.max(minBar, Math.round((value / maxVal) * 100))
}

export default function HealthTrendPage() {
  const [period, setPeriod] = useState<Period>(7)
  const [bpTrend, setBpTrend] = useState<BPTrend | null>(null)
  const [hrTrend, setHrTrend] = useState<HRTrend | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async (days: Period) => {
    setLoading(true)
    try {
      const [bpRes, hrRes] = await Promise.allSettled([
        getBloodPressureTrend(days),
        getHeartRateTrend(days),
      ])
      if (bpRes.status === 'fulfilled' && bpRes.value) {
        setBpTrend(bpRes.value)
      }
      if (hrRes.status === 'fulfilled' && hrRes.value) {
        setHrTrend(hrRes.value)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useLoad(() => { loadData(7) })

  const handlePeriodChange = (p: Period) => {
    setPeriod(p)
    loadData(p)
  }

  const handleBack = () => Taro.navigateBack()

  // 计算血压图表最大值
  const bpMax = bpTrend
    ? Math.max(...bpTrend.systolic, ...bpTrend.diastolic, 1)
    : 160
  const hrMax = hrTrend ? Math.max(...hrTrend.values, 1) : 120

  return (
    <View className="trend-page">
      {/* 导航栏 */}
      <View className="trend-nav">
        <View className="trend-nav__back" onClick={handleBack}>
          <ArrowRight size={20} color="#666" />
        </View>
        <Text className="trend-nav__title">健康趋势</Text>
        <View className="trend-nav__placeholder" />
      </View>

      {/* 时间周期切换 */}
      <View className="period-tabs">
        <View
          className={`period-tabs__item ${period === 7 ? 'period-tabs__item--active' : ''}`}
          onClick={() => handlePeriodChange(7)}
        >
          <Text>近7天</Text>
        </View>
        <View
          className={`period-tabs__item ${period === 30 ? 'period-tabs__item--active' : ''}`}
          onClick={() => handlePeriodChange(30)}
        >
          <Text>近30天</Text>
        </View>
      </View>

      {loading ? (
        <View className="trend-loading">
          <Text className="trend-loading__text">加载中...</Text>
        </View>
      ) : (
        <View className="trend-content">
          {/* 血压趋势 */}
          <View className="chart-card">
            <View className="chart-card__header">
              <View className="chart-card__icon-wrap" style={{ background: '#fce4e4' }}>
                <Heart size={18} color="#e53935" />
              </View>
              <Text className="chart-card__title">血压趋势</Text>
            </View>
            <View className="chart-card__legend">
              <View className="legend-item">
                <View className="legend-item__dot" style={{ background: '#FF6B6B' }} />
                <Text className="legend-item__label">收缩压</Text>
              </View>
              <View className="legend-item">
                <View className="legend-item__dot" style={{ background: '#4ECDC4' }} />
                <Text className="legend-item__label">舒张压</Text>
              </View>
            </View>

            {bpTrend && bpTrend.dates.length > 0 ? (
              <View className="bar-chart">
                {bpTrend.dates.map((date, i) => (
                  <View key={date} className="bar-chart__col">
                    <View className="bar-chart__bars">
                      <View className="bar-chart__bar-group">
                        <View
                          className="bar-chart__bar bar-chart__bar--systolic"
                          style={{ height: `${getBarHeightPercent(bpTrend.systolic[i], bpMax)}%` }}
                        />
                        <View
                          className="bar-chart__bar bar-chart__bar--diastolic"
                          style={{ height: `${getBarHeightPercent(bpTrend.diastolic[i], bpMax)}%` }}
                        />
                      </View>
                    </View>
                    <Text className="bar-chart__label">{formatDateLabel(date, period)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className="chart-empty">
                <Text className="chart-empty__text">暂无数据</Text>
              </View>
            )}

            {/* 正常范围参考线说明 */}
            <View className="chart-card__reference">
              <Text className="chart-card__reference-text">参考范围：收缩压 90-140 mmHg · 舒张压 60-90 mmHg</Text>
            </View>
          </View>

          {/* 心率趋势 */}
          <View className="chart-card">
            <View className="chart-card__header">
              <View className="chart-card__icon-wrap" style={{ background: '#ffebee' }}>
                <Heart size={18} color="#d32f2f" />
              </View>
              <Text className="chart-card__title">心率趋势</Text>
            </View>
            <View className="chart-card__legend">
              <View className="legend-item">
                <View className="legend-item__dot" style={{ background: '#e53935' }} />
                <Text className="legend-item__label">心率（次/分）</Text>
              </View>
            </View>

            {hrTrend && hrTrend.dates.length > 0 ? (
              <View className="bar-chart bar-chart--single">
                {hrTrend.dates.map((date, i) => (
                  <View key={date} className="bar-chart__col">
                    <View className="bar-chart__bars">
                      <View
                        className="bar-chart__bar bar-chart__bar--hr"
                        style={{ height: `${getBarHeightPercent(hrTrend.values[i], hrMax)}%` }}
                      />
                    </View>
                    <Text className="bar-chart__label">{formatDateLabel(date, period)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className="chart-empty">
                <Text className="chart-empty__text">暂无数据</Text>
              </View>
            )}

            <View className="chart-card__reference">
              <Text className="chart-card__reference-text">参考范围：60-100 次/分</Text>
            </View>
          </View>

          {/* 健康提示 */}
          <View className="health-tip">
            <Text className="health-tip__title">健康提示</Text>
            <Text className="health-tip__text">
              坚持每天测量血压和心率，有助于及时发现健康变化。建议早晨起床后、晚上睡前各测量一次。
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}
