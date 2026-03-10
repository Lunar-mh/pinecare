import { useState, useEffect, useCallback } from 'react';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { Icon } from '@/components/icons';
import {
  MetricCard,
  AlertBanner,
  SectionTitle,
  LargeButton
} from '@/components/elderly';
import {
  getTodayHealthOverview,
  getHealthAlerts,
  dismissHealthAlert
} from '@/services/modules/health';
import type { BloodPressureRecord, HeartRateRecord } from '@/services/types';
import './index.scss';

type MetricStatus = 'normal' | 'warning' | 'danger';

export default function HealthIndex() {
  const [bloodPressure, setBloodPressure] = useState<BloodPressureRecord | null>(null);
  const [heartRate, setHeartRate] = useState<HeartRateRecord | null>(null);
  const [steps, setSteps] = useState<number>(0);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); // Initial loading state

  const loadHealthData = useCallback(async () => {
    setLoading(true);
    try {
      const [overview, alertList] = await Promise.all([
        getTodayHealthOverview(),
        getHealthAlerts()
      ]);

      setBloodPressure(overview.bloodPressure || null);
      setHeartRate(overview.heartRate || null);
      setSteps(overview.steps || 0);
      setAlerts(alertList.slice(0, 3));
    } catch (error) {
      console.error('加载健康数据失败:', error);
    } finally {
      // Add artificial delay for smoother visual transition (optional, but good for perceived quality)
      setTimeout(() => setLoading(false), 500);
    }
  }, []);

  useEffect(() => {
    loadHealthData();
  }, [loadHealthData]);

  usePullDownRefresh(() => {
    loadHealthData().then(() => {
      Taro.stopPullDownRefresh();
    });
  });

  const handleDismissAlert = async (alertId: string) => {
    try {
      await dismissHealthAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      Taro.showToast({ title: '已忽略', icon: 'success' });
    } catch (error) {
      console.error('忽略提醒失败:', error);
    }
  };

  const navigateToBloodPressure = () => {
    Taro.navigateTo({ url: '/subpackages/health/pages/blood-pressure/index' });
  };

  const navigateToHeartRate = () => {
    Taro.navigateTo({ url: '/subpackages/health/pages/heart-rate/index' });
  };

  const navigateToTrend = () => {
    Taro.navigateTo({ url: '/subpackages/health/pages/trend/index' });
  };

  const getBPStatus = (bp: BloodPressureRecord | null): MetricStatus => bp?.status ?? 'normal';
  const getHRStatus = (hr: HeartRateRecord | null): MetricStatus => hr?.status ?? 'normal';

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  return (
    <View className="health-index">
      <ScrollView className="health-index__scroll" scrollY>
        {alerts.length > 0 ? (
          <View className="health-index__alerts">
            {alerts.map((alert) => (
              <AlertBanner
                key={alert.id}
                type={alert.level === 'danger' ? 'danger' : 'warning'}
                title={alert.message}
                message={alert.suggestion}
                closable
                onClose={() => handleDismissAlert(alert.id)}
              />
            ))}
          </View>
        ) : (
          !loading && (
            <View className="health-index__alerts health-index__alerts--empty">
              <View className="empty-icon-wrapper">
                <Icon name="check" size={24} color="#43a047" />
              </View>
              <Text className="empty-text">今日健康状况良好，请继续保持</Text>
            </View>
          )
        )}

        <View className="health-index__metrics">
          <MetricCard
            title="血压"
            loading={loading}
            value={bloodPressure ? `${bloodPressure.systolic}/${bloodPressure.diastolic}` : '--/--'}
            unit="mmHg"
            subtitle={bloodPressure ? `测量于 ${formatTime(bloodPressure.measuredAt)}` : '今日未测量'}
            status={getBPStatus(bloodPressure)}
            trend="stable"
            onClick={navigateToBloodPressure}
          />
          <MetricCard
            title="心率"
            loading={loading}
            value={heartRate ? String(heartRate.value) : '--'}
            unit="bpm"
            subtitle={heartRate ? `测量于 ${formatTime(heartRate.measuredAt)}` : '今日未测量'}
            status={getHRStatus(heartRate)}
            trend="stable"
            onClick={navigateToHeartRate}
          />
          <View className="health-index__metric--full">
            <MetricCard
              title="今日步数"
              loading={loading}
              value={steps > 0 ? String(steps) : '--'}
              unit="步"
              subtitle="目标 5000 步"
              status="normal"
              trend={steps > 3000 ? 'up' : 'stable'}
            />
        </View>
        </View>

        <SectionTitle
          title="健康趋势"
          action="查看详情 →"
          onAction={navigateToTrend}
        />
        <View className="health-index__trend-card" onClick={navigateToTrend} role="button">
          <View className="trend-placeholder">
            <Icon name="transit" size={48} color="#01579b" />
            <Text className="trend-placeholder__text">查看近7天健康数据趋势</Text>
          </View>
        </View>

        <SectionTitle title="快捷操作" />
        <View className="health-index__actions">
          <View className="action-item" onClick={navigateToBloodPressure}>
            <View className="action-item__icon" style={{ background: '#E3F2FD' }}>
              <Icon name="heart" size={32} color="#01579b" />
            </View>
            <Text className="action-item__text">记录血压</Text>
          </View>
          <View className="action-item" onClick={navigateToHeartRate}>
            <View className="action-item__icon" style={{ background: '#FFF3E0' }}>
              <Icon name="user" size={32} color="#F57C00" />
            </View>
            <Text className="action-item__text">记录心率</Text>
          </View>
          <View
            className="action-item"
            onClick={() => Taro.navigateTo({ url: '/subpackages/health/pages/records/index' })}
          >
            <View className="action-item__icon" style={{ background: '#F3E5F5' }}>
              <Icon name="order" size={32} color="#7B1FA2" />
            </View>
            <Text className="action-item__text">历史记录</Text>
          </View>
        </View>

        <View className="safe-area-bottom" />
      </ScrollView>

      <View className="health-index__fab">
        <LargeButton
          type="primary"
          size="medium"
          icon={<Icon name="plus" size={24} color="#fff" />}
          onClick={() => {
            Taro.showActionSheet({
              itemList: ['记录血压', '记录心率', '记录血糖', '记录体重'],
              success: (res) => {
                const actions = [
                  navigateToBloodPressure,
                  navigateToHeartRate,
                  () => Taro.showToast({ title: '功能开发中', icon: 'none' }),
                  () => Taro.showToast({ title: '功能开发中', icon: 'none' })
                ];
                actions[res.tapIndex]?.();
              }
            });
          }}
        >
          记一笔
        </LargeButton>
      </View>
    </View>
  );
}
