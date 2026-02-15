import { useState, useCallback, useEffect, useRef } from 'react';
import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { Warning, Phone, User, ArrowRight, Tips } from '@nutui/icons-react-taro';
import { triggerSOS, getCurrentSOSStatus, cancelSOS } from '@/services/modules/sos';
import './index.scss';

export default function SOSIndex() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeSOS, setActiveSOS] = useState<{ id: string; triggeredAt: string } | null>(null);
  const [countdown, setCountdown] = useState(3);

  const checkSOSStatus = useCallback(async () => {
    try {
      const status = await getCurrentSOSStatus();
      if (status.active && status.event) {
        setActiveSOS({
          id: status.event.id,
          triggeredAt: status.event.triggeredAt
        });
      }
    } catch (error) {
      console.error('检查SOS状态失败:', error);
    }
  }, []);

  useEffect(() => {
    checkSOSStatus();
  }, [checkSOSStatus]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const clearPressTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const triggerEmergency = async () => {
    try {
      Taro.showLoading({ title: '发送求助中...' });

      const locationRes = await Taro.getLocation({ type: 'gcj02' });

      const sosEvent = await triggerSOS({
        type: 'manual',
        location: {
          latitude: locationRes.latitude,
          longitude: locationRes.longitude,
          address: '待核验'
        }
      });

      Taro.hideLoading();
      setActiveSOS({
        id: sosEvent.id,
        triggeredAt: sosEvent.triggeredAt
      });

      Taro.showToast({
        title: '求助已发送',
        icon: 'success',
        duration: 2000
      });
    } catch (error) {
      Taro.hideLoading();
      console.error('触发SOS失败:', error);
      Taro.showToast({
        title: '发送失败，请重试',
        icon: 'none'
      });
    } finally {
      setPressing(false);
      setProgress(0);
      setCountdown(3);
    }
  };

  const handleTouchStart = () => {
    if (activeSOS) return;

    clearPressTimer();

    setPressing(true);
    setProgress(0);
    setCountdown(3);

    const durationMs = 3000;
    const tickMs = 30;
    let elapsedMs = 0;

    intervalRef.current = setInterval(() => {
      elapsedMs += tickMs;
      const nextProgress = Math.min(100, Math.round((elapsedMs / durationMs) * 100));
      setProgress(nextProgress);

      const remainingMs = Math.max(0, durationMs - elapsedMs);
      setCountdown(Math.max(1, Math.ceil(remainingMs / 1000)));

      if (elapsedMs >= durationMs) {
        clearPressTimer();
        triggerEmergency();
      }
    }, tickMs);
  };

  const handleTouchEnd = () => {
    clearPressTimer();

    setPressing(false);
    setProgress(0);
    setCountdown(3);
  };

  const handleCancelSOS = async () => {
    if (!activeSOS) return;

    Taro.showModal({
      title: '确认取消',
      content: '确定要取消本次紧急求助吗？',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (!res.confirm) return;

        try {
          Taro.showLoading({ title: '取消中...' });
          await cancelSOS(activeSOS.id);
          setActiveSOS(null);
          Taro.hideLoading();
          Taro.showToast({ title: '已取消', icon: 'success' });
        } catch (error) {
          Taro.hideLoading();
          console.error('取消失败:', error);
          Taro.showToast({ title: '取消失败', icon: 'none' });
        }
      }
    });
  };

  const handleCallEmergency = () => {
    Taro.makePhoneCall({
      phoneNumber: '120',
      fail: () => {
        Taro.showToast({ title: '拨打失败', icon: 'none' });
      }
    });
  };

  return (
    <View className="sos-page">
      <View className="sos-header">
        <Text className="sos-header__title">紧急求助</Text>
        <Text className="sos-header__desc">长按下方按钮3秒触发紧急求助</Text>
      </View>

      <View className="sos-trigger-area">
        {activeSOS ? (
          <View className="sos-active-card">
            <View className="sos-active-icon">
              <Warning size={48} color="#fff" />
            </View>
            <Text className="sos-active-title">紧急求助已触发</Text>
            <Text className="sos-active-time">
              触发时间：{new Date(activeSOS.triggeredAt).toLocaleString('zh-CN')}
            </Text>
            <Text className="sos-active-desc">已通知紧急联系人，请保持手机畅通</Text>
            <View className="sos-cancel-btn" onClick={handleCancelSOS}>
              <Text>误触取消</Text>
            </View>
          </View>
        ) : (
          <View
            className={`sos-button ${pressing ? 'sos-button--pressing' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <View
              className="sos-button__progress"
              style={{
                background: `conic-gradient(#fff ${progress * 3.6}deg, transparent ${progress * 3.6}deg)`
              }}
            />

            <View className="sos-button__inner">
              <Warning size={48} color="#fff" />
              <Text className="sos-button__text">{pressing ? `按住 ${countdown} 秒` : 'SOS'}</Text>
            </View>

            {pressing && (
              <>
                <View className="sos-ripple sos-ripple--1" />
                <View className="sos-ripple sos-ripple--2" />
              </>
            )}
          </View>
        )}
      </View>

      <View className="emergency-contacts">
        <Text className="section-title">紧急联系电话</Text>
        <View className="contact-list">
          <View className="contact-item contact-item--emergency" onClick={handleCallEmergency}>
            <View className="contact-icon">
              <Phone size={32} color="#fff" />
            </View>
            <View className="contact-info">
              <Text className="contact-name">急救中心</Text>
              <Text className="contact-number">120</Text>
            </View>
            <View className="contact-action">
              <Text className="contact-action__text">立即拨打</Text>
            </View>
          </View>

          <View
            className="contact-item"
            onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none' })}
          >
            <View className="contact-icon" style={{ background: '#E3F2FD' }}>
              <User size={32} color="#01579b" />
            </View>
            <View className="contact-info">
              <Text className="contact-name">紧急联系人</Text>
              <Text className="contact-desc">查看或联系已设置的紧急联系人</Text>
            </View>
            <ArrowRight size={24} color="#999" />
          </View>
        </View>
      </View>

      <View className="sos-guide">
        <Text className="section-title">使用说明</Text>
        <View className="guide-list">
          <View className="guide-item">
            <Text className="guide-number">1</Text>
            <Text className="guide-text">长按SOS按钮3秒触发紧急求助</Text>
          </View>
          <View className="guide-item">
            <Text className="guide-number">2</Text>
            <Text className="guide-text">系统自动发送位置和求助信息给紧急联系人</Text>
          </View>
          <View className="guide-item">
            <Text className="guide-number">3</Text>
            <Text className="guide-text">如为误触，可在30秒内点击取消</Text>
          </View>
        </View>
      </View>

      <View className="sos-warning">
        <Tips size={20} color="#F57C00" />
        <Text className="sos-warning__text">
          SOS功能仅在紧急情况下使用，滥用将占用公共救援资源
        </Text>
      </View>

      <View className="safe-area-bottom" />
    </View>
  );
}
