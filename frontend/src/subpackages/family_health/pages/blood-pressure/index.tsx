import { useState, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useLoad, usePullDownRefresh } from '@tarojs/taro';
import { getBloodPressureRecords, getLatestBloodPressure } from '@/services/modules/health';
import type { BloodPressureRecord, PaginatedResult } from '@/services/types';
import './index.scss';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  normal: { label: '正常', color: '#43a047' },
  warning: { label: '偏高', color: '#fb8c00' },
  danger: { label: '危险', color: '#e53935' },
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function FamilyBloodPressurePage() {
  const [latest, setLatest] = useState<BloodPressureRecord | null>(null);
  const [records, setRecords] = useState<BloodPressureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [latestData, listData] = await Promise.all([
        getLatestBloodPressure(),
        getBloodPressureRecords({ page: 1, pageSize: 14 }),
      ]);
      setLatest(latestData);
      setRecords((listData as unknown as PaginatedResult<BloodPressureRecord>)?.list || []);
    } catch (_e: unknown) {
      setError('加载失败，请下拉刷新重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useLoad(() => {
    loadData();
  });

  usePullDownRefresh(() => {
    loadData().then(() => Taro.stopPullDownRefresh());
  });

  const statusInfo = latest ? (STATUS_MAP[latest.status] || STATUS_MAP.normal) : null;

  // 简易趋势条形图（最近7条）
  const chartData = records.slice(0, 7).reverse();
  const maxSystolic = chartData.length ? Math.max(...chartData.map(r => r.systolic), 160) : 160;

  return (
    <ScrollView className="family-health-detail" scrollY>
      {/* 页面标题 */}
      <View className="fhd-header">
        <Text className="fhd-header__title">血压监测</Text>
        <Text className="fhd-header__subtitle">长辈血压历史数据</Text>
      </View>

      {loading ? (
        <View className="fhd-loading"><Text>加载中...</Text></View>
      ) : error ? (
        <View className="fhd-error"><Text>{error}</Text></View>
      ) : (
        <>
          {/* 最新数值卡片 */}
          <View className="fhd-latest-card">
            <Text className="fhd-latest-card__label">最新血压</Text>
            {latest ? (
              <>
                <View className="fhd-latest-card__value-row">
                  <Text className="fhd-latest-card__systolic">{latest.systolic}</Text>
                  <Text className="fhd-latest-card__sep">/</Text>
                  <Text className="fhd-latest-card__diastolic">{latest.diastolic}</Text>
                  <Text className="fhd-latest-card__unit">mmHg</Text>
                </View>
                <View className="fhd-latest-card__status-row">
                  <View
                    className="fhd-latest-card__status-badge"
                    style={{ backgroundColor: statusInfo?.color + '22', borderColor: statusInfo?.color }}
                  >
                    <Text style={{ color: statusInfo?.color }}>{statusInfo?.label}</Text>
                  </View>
                  <Text className="fhd-latest-card__time">{formatTime(latest.measuredAt)}</Text>
                </View>
                {latest.pulse && (
                  <Text className="fhd-latest-card__pulse">脉搏：{latest.pulse} 次/分</Text>
                )}
              </>
            ) : (
              <Text className="fhd-empty-hint">暂无记录</Text>
            )}
          </View>

          {/* 参考范围说明 */}
          <View className="fhd-reference">
            <View className="fhd-reference__item fhd-reference__item--normal">
              <Text className="fhd-reference__dot" />
              <Text className="fhd-reference__text">正常：90-120 / 60-80</Text>
            </View>
            <View className="fhd-reference__item fhd-reference__item--warning">
              <Text className="fhd-reference__dot" />
              <Text className="fhd-reference__text">偏高：120-140 / 80-90</Text>
            </View>
            <View className="fhd-reference__item fhd-reference__item--danger">
              <Text className="fhd-reference__dot" />
              <Text className="fhd-reference__text">危险：&gt;140 / &gt;90</Text>
            </View>
          </View>

          {/* 近7次趋势图 */}
          {chartData.length > 0 && (
            <View className="fhd-chart-section">
              <Text className="fhd-section-title">近期趋势</Text>
              <View className="fhd-chart">
                {chartData.map((r, i) => (
                  <View key={r.id || i} className="fhd-chart__bar-group">
                    <View className="fhd-chart__bars">
                      <View
                        className="fhd-chart__bar fhd-chart__bar--systolic"
                        style={{ height: `${(r.systolic / maxSystolic) * 80}px` }}
                      />
                      <View
                        className="fhd-chart__bar fhd-chart__bar--diastolic"
                        style={{ height: `${(r.diastolic / maxSystolic) * 80}px` }}
                      />
                    </View>
                    <Text className="fhd-chart__label">{new Date(r.measuredAt).getDate()}日</Text>
                  </View>
                ))}
              </View>
              <View className="fhd-chart__legend">
                <View className="fhd-chart__legend-item">
                  <View className="fhd-chart__legend-dot fhd-chart__legend-dot--systolic" />
                  <Text className="fhd-chart__legend-text">收缩压</Text>
                </View>
                <View className="fhd-chart__legend-item">
                  <View className="fhd-chart__legend-dot fhd-chart__legend-dot--diastolic" />
                  <Text className="fhd-chart__legend-text">舒张压</Text>
                </View>
              </View>
            </View>
          )}

          {/* 历史记录列表 */}
          <View className="fhd-history">
            <Text className="fhd-section-title">历史记录</Text>
            {records.length === 0 ? (
              <View className="fhd-empty"><Text className="fhd-empty__text">暂无历史记录</Text></View>
            ) : (
              records.map((r, i) => (
                <View key={r.id || i} className="fhd-record-item">
                  <View className="fhd-record-item__left">
                    <Text className="fhd-record-item__value">{r.systolic}/{r.diastolic}</Text>
                    <Text className="fhd-record-item__unit">mmHg</Text>
                  </View>
                  <View className="fhd-record-item__right">
                    <View
                      className="fhd-record-item__status"
                      style={{ color: STATUS_MAP[r.status]?.color || '#43a047' }}
                    >
                      <Text>{STATUS_MAP[r.status]?.label || '正常'}</Text>
                    </View>
                    <Text className="fhd-record-item__time">{formatTime(r.measuredAt)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      )}
      <View className="safe-area-bottom" />
    </ScrollView>
  );
}
