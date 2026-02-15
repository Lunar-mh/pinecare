import './index.scss'

import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { Heart, ArrowRight, Warning } from '@nutui/icons-react-taro'
import { getBloodPressureRecords, getHeartRateRecords } from '@/services'
import type { BloodPressureRecord, HeartRateRecord } from '@/services/types'

type RecordType = 'blood_pressure' | 'heart_rate'

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

function getStatusText(status: 'normal' | 'warning' | 'danger'): string {
  if (status === 'normal') return '正常'
  if (status === 'warning') return '偏高'
  return '危险'
}

export default function HealthRecordsPage() {
  const [type, setType] = useState<RecordType>('blood_pressure')
  const [bpRecords, setBpRecords] = useState<BloodPressureRecord[]>([])
  const [hrRecords, setHrRecords] = useState<HeartRateRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)

  const PAGE_SIZE = 20

  const loadBpRecords = useCallback(async (pageNum: number, reset = false) => {
    if (loading) return
    setLoading(true)
    try {
      const res = await getBloodPressureRecords({ page: pageNum, pageSize: PAGE_SIZE })
      const paged = res as unknown as import('@/services/types').PaginatedResult<BloodPressureRecord>
      const list = paged.list || []
      setBpRecords(prev => reset ? list : [...prev, ...list])
      setHasMore(paged.hasMore)
      setPage(pageNum)
    } finally {
      setLoading(false)
    }
  }, [loading])

  const loadHrRecords = useCallback(async (pageNum: number, reset = false) => {
    if (loading) return
    setLoading(true)
    try {
      const res = await getHeartRateRecords({ page: pageNum, pageSize: PAGE_SIZE })
      const paged = res as unknown as import('@/services/types').PaginatedResult<HeartRateRecord>
      const list = paged.list || []
      setHrRecords(prev => reset ? list : [...prev, ...list])
      setHasMore(paged.hasMore)
      setPage(pageNum)
    } finally {
      setLoading(false)
    }
  }, [loading])

  useLoad(() => {
    loadBpRecords(1, true)
  })

  const handleTypeChange = (t: RecordType) => {
    if (t === type) return
    setType(t)
    setPage(1)
    setHasMore(true)
    if (t === 'blood_pressure') {
      setBpRecords([])
      loadBpRecords(1, true)
    } else {
      setHrRecords([])
      loadHrRecords(1, true)
    }
  }

  const handleLoadMore = () => {
    if (!hasMore || loading) return
    const nextPage = page + 1
    if (type === 'blood_pressure') {
      loadBpRecords(nextPage)
    } else {
      loadHrRecords(nextPage)
    }
  }

  const handleBack = () => Taro.navigateBack()

  const records = type === 'blood_pressure' ? bpRecords : hrRecords

  return (
    <View className="records-page">
      {/* 导航栏 */}
      <View className="records-nav">
        <View className="records-nav__back" onClick={handleBack}>
          <ArrowRight size={20} color="#666" />
        </View>
        <Text className="records-nav__title">历史记录</Text>
        <View className="records-nav__placeholder" />
      </View>

      {/* 类型切换 */}
      <View className="type-tabs">
        <View
          className={`type-tabs__item ${type === 'blood_pressure' ? 'type-tabs__item--active' : ''}`}
          onClick={() => handleTypeChange('blood_pressure')}
        >
          <Text>血压记录</Text>
        </View>
        <View
          className={`type-tabs__item ${type === 'heart_rate' ? 'type-tabs__item--active' : ''}`}
          onClick={() => handleTypeChange('heart_rate')}
        >
          <Text>心率记录</Text>
        </View>
      </View>

      {/* 记录列表 */}
      <ScrollView
        className="records-scroll"
        scrollY
        onScrollToLower={handleLoadMore}
        enableBackToTop
      >
        {records.length === 0 && !loading ? (
          <View className="records-empty">
            <Text className="records-empty__text">暂无记录</Text>
            <Text className="records-empty__hint">点击右上角"+"添加第一条记录</Text>
          </View>
        ) : (
          <View className="records-list">
            {type === 'blood_pressure'
              ? (bpRecords as BloodPressureRecord[]).map(r => (
                <View key={r.id} className="record-item">
                  <View className="record-item__left">
                    <View className="record-item__icon-wrap" style={{ background: '#fce4e4' }}>
                      <Heart size={18} color="#e53935" />
                    </View>
                    <View className="record-item__info">
                      <View className="record-item__value-row">
                        <Text className="record-item__value">{r.systolic}/{r.diastolic}</Text>
                        <Text className="record-item__unit">mmHg</Text>
                      </View>
                      {r.pulse !== undefined && (
                        <Text className="record-item__sub">脉搏 {r.pulse} 次/分</Text>
                      )}
                      <Text className="record-item__time">{formatTime(r.measuredAt)}</Text>
                    </View>
                  </View>
                  <View className={`record-item__badge record-item__badge--${r.status}`}>
                    {r.status !== 'normal' && <Warning size={12} color={r.status === 'warning' ? '#fb8c00' : '#e53935'} />}
                    <Text>{getStatusText(r.status)}</Text>
                  </View>
                </View>
              ))
              : (hrRecords as HeartRateRecord[]).map(r => (
                <View key={r.id} className="record-item">
                  <View className="record-item__left">
                    <View className="record-item__icon-wrap" style={{ background: '#ffebee' }}>
                      <Heart size={18} color="#d32f2f" />
                    </View>
                    <View className="record-item__info">
                      <View className="record-item__value-row">
                        <Text className="record-item__value">{r.value}</Text>
                        <Text className="record-item__unit">次/分</Text>
                      </View>
                      <Text className="record-item__time">{formatTime(r.measuredAt)}</Text>
                    </View>
                  </View>
                  <View className={`record-item__badge record-item__badge--${r.status}`}>
                    {r.status !== 'normal' && <Warning size={12} color={r.status === 'warning' ? '#fb8c00' : '#e53935'} />}
                    <Text>{getStatusText(r.status)}</Text>
                  </View>
                </View>
              ))
            }

            {loading && (
              <View className="records-loading">
                <Text className="records-loading__text">加载中...</Text>
              </View>
            )}

            {!hasMore && records.length > 0 && (
              <View className="records-end">
                <Text className="records-end__text">— 已显示全部记录 —</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}
