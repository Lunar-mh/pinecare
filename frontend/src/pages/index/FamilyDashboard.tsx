import React, { useState } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { get } from '@/services/request';
import { ElderlyOverview } from '@/services/types';
import { MetricCard } from '@/components/elderly/MetricCard';
import { AlertBanner } from '@/components/elderly/AlertBanner';
import { SectionTitle } from '@/components/elderly/SectionTitle';
import { LocationIcon, UserIcon } from '@/components/icons';
import './FamilyDashboard.scss';

const FamilyDashboard: React.FC = () => {
  const [data, setData] = useState<ElderlyOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useLoad(() => {
    fetchData();
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await get<ElderlyOverview>('/family/elderly-overview');
      setData(response);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message || '加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleBindClick = () => {
    Taro.navigateTo({
      url: '/subpackages/family_space/pages/index/index'
    });
  };

  const handleHealthDetailClick = (type: 'blood-pressure' | 'heart-rate') => {
    Taro.navigateTo({
      url: `/subpackages/family_health/pages/${type}/index`
    });
  };

  const handleSOSDetailClick = () => {
    Taro.navigateTo({
      url: '/subpackages/sos/pages/index/index'
    });
  };

  if (loading) {
    return (
      <View className="family-dashboard">
        <View className="family-dashboard__loading">
          <Text>加载中...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="family-dashboard">
        <View className="family-dashboard__error">
          <Text>{error}</Text>
          <Button className="family-dashboard__retry-btn" onClick={fetchData}>重试</Button>
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View className="family-dashboard">
        <View className="family-dashboard__empty-state">
          <Text className="family-dashboard__empty-text">暂未绑定长辈账号</Text>
          <Button className="family-dashboard__bind-button" onClick={handleBindClick}>
            去绑定
          </Button>
        </View>
      </View>
    );
  }

  const {
    name,
    isOnline,
    lastActiveAt,
    todayHealth,
    location,
    alerts
  } = data;

  const bpData = todayHealth?.bloodPressure;
  const hrData = todayHealth?.heartRate;
  const medicationProgress = todayHealth?.medicationProgress || 0;

  const unreadAlerts = alerts ? alerts.filter(a => !a.isRead) : [];

  const getAlertType = (type: string): 'warning' | 'danger' | 'info' | 'success' => {
    switch (type) {
      case 'health': return 'warning';
      case 'medication': return 'info';
      case 'sos': return 'danger';
      case 'location': return 'info';
      default: return 'info';
    }
  };

  return (
    <View className="family-dashboard">
      {/* Header bar */}
      <View className="family-dashboard__header">
        <Text className="family-dashboard__header-title">家属视角</Text>
        <Text className="family-dashboard__header-subtitle">实时关注长辈健康</Text>
      </View>

      {/* Elder card */}
      <View className="family-dashboard__elder-card">
        <View className="family-dashboard__avatar">
          <UserIcon size={40} color="#ffffff" />
        </View>
        <View className="family-dashboard__elder-info">
          <Text className="family-dashboard__elder-name">{name}</Text>
          <View className="family-dashboard__status-row">
            <View className={`family-dashboard__online-badge ${!isOnline ? 'family-dashboard__online-badge--offline' : ''}`}>
              <Text>{isOnline ? '在线' : '离线'}</Text>
            </View>
            <Text className="family-dashboard__last-active">
              {lastActiveAt ? `最后活跃: ${lastActiveAt}` : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Health row - 点击跳转详情 */}
      <View className="family-dashboard__health-row">
        <View
          className="family-dashboard__health-item"
          onClick={() => handleHealthDetailClick('blood-pressure')}
        >
          <MetricCard
            title="血压"
            value={bpData ? `${bpData.systolic}/${bpData.diastolic}` : '--'}
            unit="mmHg"
            status={bpData?.status || 'normal'}
          />
        </View>
        <View
          className="family-dashboard__health-item"
          onClick={() => handleHealthDetailClick('heart-rate')}
        >
          <MetricCard
            title="心率"
            value={hrData ? hrData.value.toString() : '--'}
            unit="次/分"
            status={hrData?.status || 'normal'}
          />
        </View>
      </View>

      {/* Medication progress */}
      <View className="family-dashboard__section">
        <View className="family-dashboard__medication-card">
          <View className="family-dashboard__medication-header">
            <Text className="family-dashboard__medication-title">今日用药</Text>
            <Text className="family-dashboard__medication-value">{medicationProgress}%</Text>
          </View>
          <View className="family-dashboard__progress-bar-bg">
            <View
              className="family-dashboard__progress-bar-fill"
              style={{ width: `${medicationProgress}%` }}
            />
          </View>
        </View>
      </View>

      {/* Location card */}
      <View className="family-dashboard__section">
        <SectionTitle title="当前位置" />
        <View className="family-dashboard__location-card">
          <View className="family-dashboard__location-icon">
            <LocationIcon size={24} />
          </View>
          <View className="family-dashboard__location-info">
            {location?.address ? (
              <>
                <Text className="family-dashboard__location-address">{location.address}</Text>
                <Text className="family-dashboard__location-time">更新于: {location.updatedAt}</Text>
              </>
            ) : (
              <Text className="family-dashboard__location-address">暂无位置信息</Text>
            )}
          </View>
        </View>
      </View>

      {/* Alerts section */}
      <View className="family-dashboard__section">
        <View className="family-dashboard__alerts-header">
          <SectionTitle title="待处理提醒" />
          {unreadAlerts.some(a => a.type === 'sos') && (
            <View className="family-dashboard__sos-btn" onClick={handleSOSDetailClick}>
              <Text className="family-dashboard__sos-btn-text">查看SOS</Text>
            </View>
          )}
        </View>
        <View className="family-dashboard__alerts-list">
          {unreadAlerts.length > 0 ? (
            unreadAlerts.map(alert => (
              <AlertBanner
                key={alert.id}
                type={getAlertType(alert.type)}
                title={alert.title}
                message={alert.message}
              />
            ))
          ) : (
            <View className="family-dashboard__empty-alerts">
              <Text>暂无待处理提醒</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default FamilyDashboard;
