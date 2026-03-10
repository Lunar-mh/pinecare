import { useState, useEffect, useCallback } from 'react';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import { Icon } from '@/components/icons';
import { SectionTitle } from '@/components/elderly';
import {
  getFamilyMembers,
  getVoiceMessages,
  markMessageRead,
  getAlbumPhotos,
  getUnreadMessageCount,
  uploadAlbumPhoto,
} from '@/services/modules/family';
import type { FamilyMember, VoiceMessage, AlbumPhoto } from '@/services/modules/family';
import './index.scss';

type TabType = 'members' | 'voice' | 'album';

export default function FamilySpaceIndex() {
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([]);
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingVoice, setLoadingVoice] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const data = await getFamilyMembers();
      setMembers(data || []);
    } catch (_) { /* noop */ } finally {
      setLoadingMembers(false);
    }
  }, []);

  const loadVoiceMessages = useCallback(async () => {
    setLoadingVoice(true);
    try {
      const res = await getVoiceMessages({ page: 1, pageSize: 30 });
      setVoiceMessages(res?.list || []);
    } catch (_) { /* noop */ } finally {
      setLoadingVoice(false);
    }
  }, []);

  const loadPhotos = useCallback(async () => {
    setLoadingPhotos(true);
    try {
      const res = await getAlbumPhotos({ page: 1, pageSize: 30 });
      setPhotos(res?.list || []);
    } catch (_) { /* noop */ } finally {
      setLoadingPhotos(false);
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await getUnreadMessageCount();
      setUnreadCount(res?.count || 0);
    } catch (_) { /* noop */ }
  }, []);

  useEffect(() => {
    loadMembers();
    loadUnreadCount();
  }, [loadMembers, loadUnreadCount]);

  useEffect(() => {
    if (activeTab === 'voice') loadVoiceMessages();
    if (activeTab === 'album') loadPhotos();
  }, [activeTab, loadVoiceMessages, loadPhotos]);

  usePullDownRefresh(() => {
    const loads: Promise<void>[] = [loadMembers(), loadUnreadCount()];
    if (activeTab === 'voice') loads.push(loadVoiceMessages());
    if (activeTab === 'album') loads.push(loadPhotos());
    Promise.all(loads).then(() => Taro.stopPullDownRefresh());
  });

  const handleCall = (member: FamilyMember) => {
    Taro.makePhoneCall({
      phoneNumber: member.phone,
      fail: () => Taro.showToast({ title: '拨号失败', icon: 'none' }),
    });
  };

  const handlePlayVoice = async (msg: VoiceMessage) => {
    if (playingId === msg.id) {
      setPlayingId(null);
      return;
    }

    setPlayingId(msg.id);
    const ctx = Taro.createInnerAudioContext();
    ctx.src = msg.url;
    ctx.play();
    ctx.onEnded(() => setPlayingId(null));
    ctx.onError(() => {
      setPlayingId(null);
      Taro.showToast({ title: '播放失败', icon: 'none' });
    });

    if (!msg.isRead) {
      try {
        await markMessageRead(msg.id);
        setVoiceMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (_) { /* noop */ }
    }
  };

  const handleUploadPhoto = () => {
    Taro.chooseImage({
      count: 9,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const { tempFilePaths } = res;
        setLoadingPhotos(true);
        let successCount = 0;
        let failCount = 0;
        try {
          for (const filePath of tempFilePaths) {
            try {
              const token = Taro.getStorageSync('token');
              const uploadRes = await Taro.uploadFile({
                url: 'http://localhost:3000/api/v1/family-space/album/upload-file',
                filePath,
                name: 'file',
                header: {
                  Authorization: `Bearer ${token}`
                }
              });
              
              const parsed = JSON.parse(uploadRes.data);
              if (parsed.code === 0 && parsed.data) {
                await uploadAlbumPhoto({ url: parsed.data.url });
                successCount++;
              } else {
                await uploadAlbumPhoto({ url: filePath, description: '' });
                successCount++;
              }
            } catch (_e: unknown) {
              try {
                await uploadAlbumPhoto({ url: filePath, description: '' });
                successCount++;
              } catch (_fallbackErr: unknown) {
                failCount++;
              }
            }
          }
          await loadPhotos();
          if (failCount === 0) {
            Taro.showToast({ title: '上传成功', icon: 'success' });
          } else {
            Taro.showToast({ title: `成功${successCount}张，失败${failCount}张`, icon: 'none' });
          }
        } catch (_e: unknown) {
          Taro.showToast({ title: '上传失败，请重试', icon: 'none' });
        } finally {
          setLoadingPhotos(false);
        }
      }
    });
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours < 1) return '刚刚';
    if (hours < 24) return `${Math.floor(hours)}小时前`;
    if (hours < 48) return '昨天';
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const getInitials = (name: string) => name.slice(-2);

  return (
    <View className="family-space">
      <ScrollView className="family-space__scroll" scrollY>
        {/* 统计头部 */}
        <View className="family-header">
          <View className="family-header__stat">
            <Text className="family-header__stat-value">{members.length}</Text>
            <Text className="family-header__stat-label">家庭成员</Text>
          </View>
          <View className="family-header__divider" />
          <View className="family-header__stat">
            <Text className={`family-header__stat-value ${unreadCount > 0 ? 'family-header__stat-value--alert' : ''}`}>
              {unreadCount}
            </Text>
            <Text className="family-header__stat-label">未读留言</Text>
          </View>
          <View className="family-header__divider" />
          <View className="family-header__stat">
            <Text className="family-header__stat-value">{members.filter(m => m.isOnline).length}</Text>
            <Text className="family-header__stat-label">在线人数</Text>
          </View>
        </View>

        {/* Tab */}
        <View className="family-tabs">
          <View
            className={`family-tab ${activeTab === 'members' ? 'family-tab--active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            <Text className="family-tab__text">成员</Text>
          </View>
          <View
            className={`family-tab ${activeTab === 'voice' ? 'family-tab--active' : ''}`}
            onClick={() => setActiveTab('voice')}
          >
            <Text className="family-tab__text">留言</Text>
            {unreadCount > 0 && (
              <View className="family-tab__badge">
                <Text className="family-tab__badge-text">{unreadCount}</Text>
              </View>
            )}
          </View>
          <View
            className={`family-tab ${activeTab === 'album' ? 'family-tab--active' : ''}`}
            onClick={() => setActiveTab('album')}
          >
            <Text className="family-tab__text">相册</Text>
          </View>
        </View>

        {/* 成员列表 */}
        {activeTab === 'members' && (
          <>
            <SectionTitle title="家庭成员" />
            {members.length === 0 && !loadingMembers ? (
              <View className="empty-state">
                <Icon name="user" size={56} color="#ccc" />
                <Text className="empty-state__text">暂无家庭成员</Text>
                <Text className="empty-state__hint">请联系家人扫码绑定</Text>
              </View>
            ) : (
              <View className="member-list">
                {members.map(member => (
                  <View key={member.id} className="member-card">
                    <View className="member-card__avatar-wrap">
                      {member.avatar ? (
                        <Image
                          className="member-card__avatar"
                          src={member.avatar}
                          mode="aspectFill"
                        />
                      ) : (
                        <View className="member-card__avatar member-card__avatar--placeholder">
                          <Text className="member-card__initials">{getInitials(member.name)}</Text>
                        </View>
                      )}
                      <View className={`member-card__online-dot ${member.isOnline ? 'member-card__online-dot--online' : ''}`} />
                    </View>
                    <View className="member-card__info">
                      <Text className="member-card__name">{member.name}</Text>
                      <Text className="member-card__relation">{member.relation}</Text>
                      <Text className="member-card__active">
                        {member.isOnline ? '在线' : `${formatTime(member.lastActiveAt)}活跃`}
                      </Text>
                    </View>
                    <View className="member-card__actions">
                      <View
                        className="member-card__action-btn member-card__action-btn--call"
                        onClick={() => handleCall(member)}
                      >
                        <Icon name="phone" size={20} color="#fff" />
                      </View>
                      <View
                        className="member-card__action-btn member-card__action-btn--msg"
                        onClick={() => setActiveTab('voice')}
                      >
                        <Icon name="heart" size={18} color="#fff" />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* 语音留言 */}
        {activeTab === 'voice' && (
          <>
            <SectionTitle title="语音留言" />
            {voiceMessages.length === 0 && !loadingVoice ? (
              <View className="empty-state">
                <Icon name="heart" size={56} color="#ccc" />
                <Text className="empty-state__text">暂无语音留言</Text>
                <Text className="empty-state__hint">家人可以给您发送语音留言</Text>
              </View>
            ) : (
              <View className="voice-list">
                {voiceMessages.map(msg => (
                  <View key={msg.id} className={`voice-item ${!msg.isRead ? 'voice-item--unread' : ''}`}>
                    <View className="voice-item__avatar-wrap">
                      {msg.fromAvatar ? (
                        <Image className="voice-item__avatar" src={msg.fromAvatar} mode="aspectFill" />
                      ) : (
                        <View className="voice-item__avatar voice-item__avatar--placeholder">
                          <Text className="voice-item__initials">{getInitials(msg.fromName)}</Text>
                        </View>
                      )}
                      {!msg.isRead && <View className="voice-item__dot" />}
                    </View>
                    <View className="voice-item__info">
                      <Text className="voice-item__from">{msg.fromName}</Text>
                      <Text className="voice-item__time">{formatTime(msg.createdAt)}</Text>
                    </View>
                    <View
                      className={`voice-play-btn ${playingId === msg.id ? 'voice-play-btn--playing' : ''}`}
                      onClick={() => handlePlayVoice(msg)}
                    >
                      {playingId === msg.id ? (
                        <View className="playing-wave">
                          <View className="playing-wave__bar" />
                          <View className="playing-wave__bar" />
                          <View className="playing-wave__bar" />
                        </View>
                      ) : (
                        <>
                          <Text className="voice-play-btn__icon">▶</Text>
                          <Text className="voice-play-btn__duration">{formatDuration(msg.duration)}</Text>
                        </>
                      )}
                    </View>
                    {msg.isRead && <Icon name="check" size={18} color="#43a047" />}
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* 相册 */}
        {activeTab === 'album' && (
          <>
            <View className="album-header">
              <SectionTitle title="家庭相册" />
              <View className="album-upload-btn" onClick={handleUploadPhoto}>
                <Icon name="plus" size={16} color="#01579b" />
                <Text className="album-upload-btn__text">上传</Text>
              </View>
            </View>
            {loadingPhotos && (
              <View className="loading-state" style={{ textAlign: 'center', padding: '20px' }}>
                <Text style={{ color: '#999', fontSize: '14px' }}>上传中...</Text>
              </View>
            )}
            {photos.length === 0 && !loadingPhotos ? (
              <View className="empty-state">
              <Icon name="heart" size={56} color="#ccc" />
                <Text className="empty-state__text">相册暂无照片</Text>
                <Text className="empty-state__hint">点击上传按钮添加照片</Text>
              </View>
            ) : (
              <View className="photo-grid">
                {photos.map(photo => (
                  <View
                    key={photo.id}
                    className="photo-item"
                    onClick={() => Taro.previewImage({ urls: [photo.url], current: photo.url })}
                  >
                    <Image
                      className="photo-item__img"
                      src={photo.thumbUrl || photo.url}
                      mode="aspectFill"
                    />
                    {photo.description && (
                      <Text className="photo-item__desc">{photo.description}</Text>
                    )}
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
