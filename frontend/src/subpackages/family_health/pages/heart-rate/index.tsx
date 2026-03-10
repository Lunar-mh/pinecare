import { useState, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useLoad, usePullDownRefresh } from '@tarojs/taro';
import { getHeartRateRecords, getLatestHeartRate } from '@/services/modules/health';
import type { HeartRateRecord, PaginatedResult } from '@/services/types';
import './index.scss';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  normal: { label: '正常', color: '#43a047' },
  warning: { label: '偏快', color: '#fb8c00' },
  danger: { label: '异常', color: '#e53935' },
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function FamilyHeartRatePage() {
  const [latest, setLatest] = useState<HeartRateRecord | null>(null);
  const [records, setRecords] = useState<HeartRateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [latestData, listData] = await Promise.all([
        getLatestHeartRate(),
        getHeartRateRecords({ page: 1, pageSize: 14 }),
      ]);
      setLatest(latestData);
      setRecords((listData as unknown as PaginatedResult<HeartRateRecord>)?.list || []);
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
  const maxVal = chartData.length ? Math.max(...chartData.map(r => r.value), 120) : 120;

  return (
    <ScrollView className="family-health-detail" scrollY>
      {/* 页面标题 */}
      <View className="fhd-header fhd-header--hr">
        <Text className="fhd-header__title">心率监测</Text>
        <Text className="fhd-header__subtitle">长辈心率历史数据</Text>
      </View>

      {loading ? (
        <View className="fhd-loading"><Text>加载中...</Text></View>
      ) : error ? (
        <View className="fhd-error"><Text>{error}</Text></View>
      ) : (
        <>
          {/* 最新数值卡片 */}
          <View className="fhd-latest-card">
            <Text className="fhd-latest-card__label">最新心率</Text>
            {latest ? (
              <>
                <View className="fhd-latest-card__value-row">
                  <Text className="fhd-latest-card__hr-value">{latest.value}</Text>
                  <Text className="fhd-latest-card__unit">次/分</Text>
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
              </>
            ) : (
              <Text className="fhd-empty-hint">暂无记录</Text>
            )}
          </View>

          {/* 参考范围说明 */}
          <View className="fhd-reference">
            <View className="fhd-reference__item fhd-reference__item--normal">
              <Text className="fhd-reference__dot" />
              <Text className="fhd-reference__text">正常静息心率：60-100 次/分</Text>
            </View>
            <View className="fhd-reference__item fhd-reference__item--warning">
              <Text className="fhd-reference__dot" />
              <Text className="fhd-reference__text">偏快：100-120 次/分</Text>
            </View>
            <View className="fhd-reference__item fhd-reference__item--danger">
              <Text className="fhd-reference__dot" />
              <Text className="fhd-reference__text">异常：&lt;50 或 &gt;120 次/分</Text>
            </View>
          </View>

          {/* 近7次趋势图 */}
          {chartData.length > 0 && (
            <View className="fhd-chart-section">
              <Text className="fhd-section-title">近期趋势</Text>
              <View className="fhd-chart fhd-chart--hr">
                {chartData.map((r, i) => (
                  <View key={r.id || i} className="fhd-chart__bar-group">
                    <View className="fhd-chart__bars">
                      <View
                        className="fhd-chart__bar fhd-chart__bar--hr"
                        style={{ height: `${(r.value / maxVal) * 80}px` }}
                      />
                    </View>
                    <Text className="fhd-chart__label">{new Date(r.measuredAt).getDate()}日</Text>
                  </View>
                ))}
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
                    <Text className="fhd-record-item__value">{r.value}</Text>
                    <Text className="fhd-record-item__unit">次/分</Text>
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
