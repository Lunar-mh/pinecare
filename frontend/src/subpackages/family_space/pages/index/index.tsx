import { useCallback, useEffect, useMemo, useState } from 'react'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { View, Text, ScrollView, Image } from '@tarojs/components'
import { Message, Photograph, Plus, Phone } from '@nutui/icons-react-taro'
import { ActionGrid, DataPanel, EmptyState, HeroHeader, PageShell, SectionBlock, StatusCard, StickyPrimaryAction } from '@/components/shell'
import {
  getAlbumPhotos,
  getFamilyMembers,
  getUnreadMessageCount,
  getVoiceMessages,
  markMessageRead,
  uploadAlbumPhoto,
} from '@/services/modules/family'
import type { AlbumPhoto, FamilyMember, VoiceMessage } from '@/services/modules/family'
import './index.scss'

type FamilyTab = 'members' | 'voice' | 'album'

export default function FamilySpaceIndex() {
  const [activeTab, setActiveTab] = useState<FamilyTab>('members')
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([])
  const [photos, setPhotos] = useState<AlbumPhoto[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [memberList, unread] = await Promise.all([getFamilyMembers(), getUnreadMessageCount()])
      setMembers(memberList || [])
      setUnreadCount(unread?.count || 0)
    } catch (loadError) {
      console.error('load family space failed', loadError)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadVoice = useCallback(async () => {
    try {
      const response = await getVoiceMessages({ page: 1, pageSize: 20 })
      setVoiceMessages(response?.list || [])
    } catch (loadError) {
      console.error('load voice messages failed', loadError)
      setVoiceMessages([])
    }
  }, [])

  const loadAlbum = useCallback(async () => {
    try {
      const response = await getAlbumPhotos({ page: 1, pageSize: 24 })
      setPhotos(response?.list || [])
    } catch (loadError) {
      console.error('load family album failed', loadError)
      setPhotos([])
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (activeTab === 'voice') loadVoice()
    if (activeTab === 'album') loadAlbum()
  }, [activeTab, loadAlbum, loadVoice])

  usePullDownRefresh(() => {
    const jobs = [loadData()]
    if (activeTab === 'voice') jobs.push(loadVoice())
    if (activeTab === 'album') jobs.push(loadAlbum())
    Promise.all(jobs).finally(() => Taro.stopPullDownRefresh())
  })

  const actionItems = useMemo(
    () => [
      { key: 'member', label: '查看家人', description: '看在线状态和联系方式', icon: <Phone size={24} /> },
      { key: 'voice', label: '听语音消息', description: '优先处理未读留言', icon: <Message size={24} />, badge: unreadCount > 0 ? `${unreadCount}` : undefined },
      { key: 'album', label: '家庭相册', description: '上传近况照片给长辈看', icon: <Photograph size={24} /> },
      { key: 'upload', label: '上传照片', description: '把今天的新照片发到家庭空间', icon: <Plus size={24} /> },
    ],
    [unreadCount],
  )

  const handleGrid = (key: string) => {
    if (key === 'member') setActiveTab('members')
    if (key === 'voice') setActiveTab('voice')
    if (key === 'album') setActiveTab('album')
    if (key === 'upload') handleUpload()
  }

  const handlePlayVoice = async (message: VoiceMessage) => {
    const audio = Taro.createInnerAudioContext()
    audio.src = message.url
    audio.play()
    if (!message.isRead) {
      try {
        await markMessageRead(message.id)
        setVoiceMessages(prev => prev.map(item => (item.id === message.id ? { ...item, isRead: true } : item)))
        setUnreadCount(prev => Math.max(0, prev - 1))
      } catch (readError) {
        console.error('mark message read failed', readError)
      }
    }
  }

  const handleUpload = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async result => {
        const [filePath] = result.tempFilePaths
        try {
          await uploadAlbumPhoto({ url: filePath })
          Taro.showToast({ title: '照片已加入相册', icon: 'success' })
          loadAlbum()
          setActiveTab('album')
        } catch (uploadError) {
          console.error('upload album photo failed', uploadError)
          Taro.showToast({ title: '上传失败，请稍后再试', icon: 'none' })
        }
      },
    })
  }

  return (
    <PageShell roleTone="family" className="family-space-overview-page">
      <HeroHeader
        roleTone="family"
        eyebrow="家庭空间"
        title="把家人的连接放在一页里"
        subtitle="成员、语音留言、家庭相册统一成一个家庭空间首页，减少切换和迷路。"
      />

      <ScrollView className="family-space-overview-page__scroll" scrollY>
        <View className="family-space-overview-page__grid">
          <StatusCard title="家庭成员" value={`${members.length}`} unit="人" hint="已绑定的家庭关系" tone="primary" icon={<Phone size={22} />} />
          <StatusCard title="未读留言" value={`${unreadCount}`} unit="条" hint="优先处理家人的语音消息" tone={unreadCount > 0 ? 'warning' : 'success'} icon={<Message size={22} />} />
        </View>

        <SectionBlock title="常用入口" description="把最常用的家庭互动动作放到最上方。">
          <ActionGrid items={actionItems} columns={2} onSelect={handleGrid} />
        </SectionBlock>

        <View className="family-space-overview-page__tabs">
          <View className={`family-space-overview-page__tab${activeTab === 'members' ? ' family-space-overview-page__tab--active' : ''}`} onClick={() => setActiveTab('members')}><Text>家庭成员</Text></View>
          <View className={`family-space-overview-page__tab${activeTab === 'voice' ? ' family-space-overview-page__tab--active' : ''}`} onClick={() => setActiveTab('voice')}><Text>语音留言</Text></View>
          <View className={`family-space-overview-page__tab${activeTab === 'album' ? ' family-space-overview-page__tab--active' : ''}`} onClick={() => setActiveTab('album')}><Text>家庭相册</Text></View>
        </View>

        {activeTab === 'members' ? (
          <SectionBlock title="家庭成员" description="一眼看到谁在线、谁是主要联系人。">
            {loading ? (
              <DataPanel tone="info"><Text className="family-space-overview-page__text">正在同步家庭成员...</Text></DataPanel>
            ) : members.length === 0 ? (
              <EmptyState title="还没有绑定家庭成员" description="先完成家属绑定，家庭空间才会变得完整。" icon={<Phone size={28} />} />
            ) : (
              <View className="family-space-overview-page__stack">
                {members.map(item => (
                  <DataPanel key={item.id} tone={item.isOnline ? 'success' : 'info'}>
                    <Text className="family-space-overview-page__title">{item.name} · {item.relation}</Text>
                    <Text className="family-space-overview-page__text">{item.phone}</Text>
                    <Text className="family-space-overview-page__meta">{item.isOnline ? '在线中' : `最近活跃 ${new Date(item.lastActiveAt).toLocaleString('zh-CN')}`}</Text>
                    <View className="family-space-overview-page__actions">
                      <View className="family-space-overview-page__button" onClick={() => Taro.makePhoneCall({ phoneNumber: item.phone })}><Text>拨打电话</Text></View>
                    </View>
                  </DataPanel>
                ))}
              </View>
            )}
          </SectionBlock>
        ) : null}

        {activeTab === 'voice' ? (
          <SectionBlock title="语音留言" description="保留家庭消息的轻量感，不把它做成复杂聊天。">
            {voiceMessages.length === 0 ? (
              <EmptyState title="还没有语音留言" description="家属发来的语音会集中在这里。" icon={<Message size={28} />} />
            ) : (
              <View className="family-space-overview-page__stack">
                {voiceMessages.map(item => (
                  <DataPanel key={item.id} tone={item.isRead ? 'info' : 'warning'}>
                    <Text className="family-space-overview-page__title">{item.fromName}</Text>
                    <Text className="family-space-overview-page__text">语音时长 {item.duration} 秒</Text>
                    <Text className="family-space-overview-page__meta">{new Date(item.createdAt).toLocaleString('zh-CN')}</Text>
                    <View className="family-space-overview-page__actions">
                      <View className="family-space-overview-page__button family-space-overview-page__button--primary" onClick={() => handlePlayVoice(item)}><Text>{item.isRead ? '再次播放' : '播放并标记已读'}</Text></View>
                    </View>
                  </DataPanel>
                ))}
              </View>
            )}
          </SectionBlock>
        ) : null}

        {activeTab === 'album' ? (
          <SectionBlock title="家庭相册" description="照片用更大的缩略图展示，适合长辈和家属一起浏览。">
            {photos.length === 0 ? (
              <EmptyState title="相册里还没有照片" description="上传一张近况照，家庭空间会更有温度。" icon={<Photograph size={28} />} />
            ) : (
              <View className="family-space-overview-page__photo-grid">
                {photos.map(photo => (
                  <View key={photo.id} className="family-space-overview-page__photo-card">
                    <Image className="family-space-overview-page__photo" src={photo.thumbUrl || photo.url} mode="aspectFill" />
                    <Text className="family-space-overview-page__photo-time">{new Date(photo.createdAt).toLocaleDateString('zh-CN')}</Text>
                  </View>
                ))}
              </View>
            )}
          </SectionBlock>
        ) : null}

        <View className="family-space-overview-page__bottom-space" />
      </ScrollView>

      <StickyPrimaryAction tone="family" label="上传家庭照片" icon={<Plus size={22} />} onClick={handleUpload} />
    </PageShell>
  )
}
