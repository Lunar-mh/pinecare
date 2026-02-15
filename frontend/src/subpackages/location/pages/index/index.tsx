import { useState, useEffect, useCallback } from 'react';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import { View, Text, ScrollView, Switch } from '@tarojs/components';
import { Transit, User, Warning, Plus, Checked, ArrowRight } from '@nutui/icons-react-taro';
import { SectionTitle, AlertBanner } from '@/components/elderly';
import {
  getCurrentLocation,
  getFamilyLocations,
  getSafeZones,
  updateLocation,
  toggleSafeZone,
} from '@/services/modules/location';
import type { LocationData, SafeZone } from '@/services/types';
import type { FamilyMemberLocation } from '@/services/modules/location';
import './index.scss';

type TabType = 'my' | 'family' | 'zones';

export default function LocationIndex() {
  const [activeTab, setActiveTab] = useState<TabType>('my');
  const [myLocation, setMyLocation] = useState<LocationData | null>(null);
  const [familyLocations, setFamilyLocations] = useState<FamilyMemberLocation[]>([]);
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  const [locating, setLocating] = useState(false);
  const [loadingFamily, setLoadingFamily] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);

  const loadMyLocation = useCallback(async () => {
    try {
      const data = await getCurrentLocation();
      setMyLocation(data);
    } catch (_) { /* noop */ }
  }, []);

  const loadFamilyLocations = useCallback(async () => {
    setLoadingFamily(true);
    try {
      const data = await getFamilyLocations();
      setFamilyLocations(data || []);
    } catch (_) { /* noop */ } finally {
      setLoadingFamily(false);
    }
  }, []);

  const loadSafeZones = useCallback(async () => {
    setLoadingZones(true);
    try {
      const data = await getSafeZones();
      setSafeZones(data || []);
    } catch (_) { /* noop */ } finally {
      setLoadingZones(false);
    }
  }, []);

  useEffect(() => {
    loadMyLocation();
    loadFamilyLocations();
    loadSafeZones();
  }, [loadMyLocation, loadFamilyLocations, loadSafeZones]);

  usePullDownRefresh(() => {
    Promise.all([loadMyLocation(), loadFamilyLocations(), loadSafeZones()]).then(() => {
      Taro.stopPullDownRefresh();
    });
  });

  const handleUpdateLocation = async () => {
    setLocating(true);
    try {
      const res = await Taro.getLocation({ type: 'gcj02' });
      const updated = await updateLocation({
        latitude: res.latitude,
        longitude: res.longitude,
      });
      setMyLocation(updated);
      Taro.showToast({ title: '位置已更新', icon: 'success' });
    } catch (_) {
      Taro.showToast({ title: '获取位置失败，请检查权限', icon: 'none' });
    } finally {
      setLocating(false);
    }
  };

  const handleToggleZone = async (zone: SafeZone) => {
    try {
      await toggleSafeZone(zone.id, !zone.isActive);
      setSafeZones(prev => prev.map(z => z.id === zone.id ? { ...z, isActive: !zone.isActive } : z));
    } catch (_) {
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  };

  const handleAddZone = () => {
    Taro.showToast({ title: '添加安全区域功能开发中', icon: 'none' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return '刚刚';
    if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    return `${Math.floor(hours / 24)}天前`;
  };

  const getStatusColor = (isOnline: boolean) => isOnline ? '#43a047' : '#999';

  return (
    <View className="location-page">
      <ScrollView className="location-page__scroll" scrollY>
        {/* 紧急提示 */}
        <AlertBanner
          type="info"
          title="位置服务已开启"
          message="您的位置信息仅对已绑定的家庭成员可见，请放心使用"
        />

        {/* Tab */}
        <View className="location-tabs">
          {([
            { key: 'my', label: '我的位置' },
            { key: 'family', label: '家人位置' },
            { key: 'zones', label: '安全区域' },
          ] as { key: TabType; label: string }[]).map(tab => (
            <View
              key={tab.key}
              className={`location-tab ${activeTab === tab.key ? 'location-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Text className="location-tab__text">{tab.label}</Text>
            </View>
          ))}
        </View>

        {/* 我的位置 */}
        {activeTab === 'my' && (
          <>
            <SectionTitle title="当前位置" />
            <View className="location-card">
              <View className="location-card__icon">
                <Transit size={28} color="#01579b" />
              </View>
              <View className="location-card__info">
                {myLocation ? (
                  <>
                    <Text className="location-card__address">{myLocation.address || '获取地址中...'}</Text>
                    <Text className="location-card__coords">
                      {myLocation.latitude.toFixed(6)}, {myLocation.longitude.toFixed(6)}
                    </Text>
                    <Text className="location-card__updated">
                      更新于 {formatTime(myLocation.updatedAt)}
                    </Text>
                  </>
                ) : (
                  <Text className="location-card__address">点击下方按钮获取位置</Text>
                )}
              </View>
            </View>

            <View className="location-actions">
              <View
                className={`location-update-btn ${locating ? 'location-update-btn--loading' : ''}`}
                onClick={handleUpdateLocation}
              >
                <Transit size={22} color="#fff" />
                <Text className="location-update-btn__text">
                  {locating ? '定位中...' : '更新我的位置'}
                </Text>
              </View>
            </View>

            {/* 位置共享状态 */}
            <SectionTitle title="共享状态" />
            <View className="share-status-list">
              {familyLocations.map(fl => (
                <View key={fl.memberId} className="share-status-item">
                  <View className="share-status-item__left">
                    <View
                      className="share-status-item__dot"
                      style={{ background: getStatusColor(fl.isOnline) }}
                    />
                    <Text className="share-status-item__name">{fl.memberName}</Text>
                    <Text className="share-status-item__relation">（{fl.relation}）</Text>
                  </View>
                  <Text className="share-status-item__status">
                    {fl.isOnline ? '实时共享中' : '离线'}
                  </Text>
                </View>
              ))}
              {familyLocations.length === 0 && !loadingFamily && (
                <View className="empty-inline">
                  <Text className="empty-inline__text">暂无家庭成员</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* 家人位置 */}
        {activeTab === 'family' && (
          <>
            <SectionTitle title="家人实时位置" />
            {familyLocations.length === 0 && !loadingFamily ? (
              <View className="empty-state">
                <User size={56} color="#ccc" />
                <Text className="empty-state__text">暂无家庭成员位置</Text>
                <Text className="empty-state__hint">请先绑定家庭成员</Text>
              </View>
            ) : (
              <View className="family-location-list">
                {familyLocations.map(fl => (
                  <View key={fl.memberId} className="family-location-card">
                    <View className="family-location-card__header">
                      <View className="family-location-card__avatar">
                        <User size={22} color="#fff" />
                        <View
                          className="family-location-card__status-dot"
                          style={{ background: getStatusColor(fl.isOnline) }}
                        />
                      </View>
                      <View className="family-location-card__info">
                        <Text className="family-location-card__name">{fl.memberName}</Text>
                        <Text className="family-location-card__relation">{fl.relation}</Text>
                      </View>
                      <View className={`family-location-card__badge ${fl.isOnline ? 'family-location-card__badge--online' : ''}`}>
                        <Text className="family-location-card__badge-text">
                          {fl.isOnline ? '在线' : '离线'}
                        </Text>
                      </View>
                    </View>
                    <View className="family-location-card__location">
                      <Transit size={16} color="#01579b" />
                      <Text className="family-location-card__address">{fl.location.address}</Text>
                    </View>
                    <Text className="family-location-card__time">
                      {formatTime(fl.location.updatedAt)}
                    </Text>
                    <View
                      className="family-location-card__map-btn"
                      onClick={() => Taro.openLocation({
                        latitude: fl.location.latitude,
                        longitude: fl.location.longitude,
                        name: fl.memberName,
                        address: fl.location.address,
                      })}
                    >
                      <ArrowRight size={14} color="#01579b" />
                      <Text className="family-location-card__map-text">查看地图</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* 安全区域 */}
        {activeTab === 'zones' && (
          <>
            <View className="zones-header">
              <SectionTitle title="安全区域设置" />
              <View className="zones-add-btn" onClick={handleAddZone}>
                <Plus size={14} color="#01579b" />
                <Text className="zones-add-btn__text">添加</Text>
              </View>
            </View>

            <AlertBanner
              type="warning"
              title="安全区域说明"
              message="当您离开设定的安全区域时，系统将自动通知绑定的家属"
            />

            {safeZones.length === 0 && !loadingZones ? (
              <View className="empty-state">
                <Warning size={56} color="#ccc" />
                <Text className="empty-state__text">暂无安全区域</Text>
                <Text className="empty-state__hint">点击添加按钮设置安全区域</Text>
              </View>
            ) : (
              <View className="zone-list">
                {safeZones.map(zone => (
                  <View key={zone.id} className={`zone-card ${!zone.isActive ? 'zone-card--inactive' : ''}`}>
                    <View className="zone-card__left">
                      <View className={`zone-card__icon ${zone.isActive ? 'zone-card__icon--active' : ''}`}>
                        <Checked size={20} color={zone.isActive ? '#fff' : '#999'} />
                      </View>
                      <View className="zone-card__info">
                        <Text className="zone-card__name">{zone.name}</Text>
                        <Text className="zone-card__radius">半径 {zone.radius} 米</Text>
                        <Text className="zone-card__coords">
                          {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      checked={zone.isActive}
                      onChange={() => handleToggleZone(zone)}
                      color="#01579b"
                    />
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <View className="safe-area-bottom" />
      </ScrollView>
    </View>
  );
}
