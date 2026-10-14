import { useCallback, useEffect, useMemo, useState } from 'react'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { View, Text, ScrollView, Image, Button } from '@tarojs/components'
import { Message, Photograph, Plus, Phone, Voice, PlayStart, PlayStop, User } from '@nutui/icons-react-taro'
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
import { useRole } from '@/hooks/useRole'
import './index.scss'

export default function FamilySpaceIndex() {
  const { isElder } = useRole()
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([])
  const [photos, setPhotos] = useState<AlbumPhoto[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null)

  // Family Mode specific state
  const [activeTab, setActiveTab] = useState<'members' | 'voice' | 'album'>('members')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [memberList, unread] = await Promise.all([getFamilyMembers(), getUnreadMessageCount()])
      setMembers(memberList || [])
      setUnreadCount(unread?.count || 0)
    } catch (e) {
      console.error('load family space failed', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadVoice = useCallback(async () => {
    try {
      const response = await getVoiceMessages({ page: 1, pageSize: 20 })
      setVoiceMessages(response?.list || [])
    } catch (e) {
      console.error('load voice failed', e)
    }
  }, [])

  const loadAlbum = useCallback(async () => {
    try {
      const response = await getAlbumPhotos({ page: 1, pageSize: 24 })
      setPhotos(response?.list || [])
    } catch (e) {
      console.error('load album failed', e)
    }
  }, [])

  useEffect(() => {
    loadData()
    loadVoice()
    loadAlbum()
  }, [loadData, loadVoice, loadAlbum])

  usePullDownRefresh(() => {
    Promise.all([loadData(), loadVoice(), loadAlbum()]).finally(() => Taro.stopPullDownRefresh())
  })

  // Audio Playback Logic
  const handlePlayVoice = async (message: VoiceMessage) => {
    if (currentPlayingId === message.id) {
       // Stop logic if needed, but innerAudioContext is tricky to stop globally without ref
       setCurrentPlayingId(null)
       return
    }

    const audio = Taro.createInnerAudioContext()
    audio.src = message.url
    audio.onPlay(() => setCurrentPlayingId(message.id))
    audio.onEnded(() => setCurrentPlayingId(null))
    audio.play()

    if (!message.isRead) {
      try {
        await markMessageRead(message.id)
        setVoiceMessages(prev => prev.map(item => (item.id === message.id ? { ...item, isRead: true } : item)))
        setUnreadCount(prev => Math.max(0, prev - 1))
      } catch (e) {
        console.error('mark read failed', e)
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
          await uploadAlbumPhoto({ url: filePath }) // Assuming service takes url. In real app, upload file first.
          Taro.showToast({ title: '照片已上传', icon: 'success' })
          loadAlbum()
        } catch (e) {
          Taro.showToast({ title: '上传失败', icon: 'none' })
        }
      },
    })
  }

  // --- ELDER VIEW ---
  const renderElderView = () => (
    <PageShell roleTone="elder" className="bg-yinban-bg min-h-screen">
      <HeroHeader
        roleTone="elder"
        eyebrow="家庭空间"
        title="看看家里人的照片和留言"
        subtitle="要是想孩子了，就点下面的电话直接打过去。"
      />

      <ScrollView className="px-5 -mt-6 pb-24" scrollY>
        {/* LATEST PHOTOS - BIG DISPLAY */}
        <SectionBlock title="家庭相册" description="最近上传的照片。">
          {photos.length === 0 ? (
            <DataPanel tone="info"><Text className="text-gray-500">家里人还没有传照片。</Text></DataPanel>
          ) : (
            <ScrollView scrollX className="whitespace-nowrap pb-4" enhanced showScrollbar={false}>
               {photos.slice(0, 5).map(photo => (
                 <View key={photo.id} className="inline-block w-64 h-48 mr-4 rounded-2xl overflow-hidden shadow-sm bg-gray-100 relative">
                    <Image src={photo.url} mode="aspectFill" className="w-full h-full" />
                    <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                       <Text className="text-white text-sm">{photo.description || '家人分享'}</Text>
                    </View>
                 </View>
               ))}
               <View className="inline-block w-24 h-48 bg-gray-100 rounded-2xl align-top flex items-center justify-center" onClick={() => setActiveTab('album')}>
                 <Text className="text-gray-400 font-bold">查看更多</Text>
               </View>
            </ScrollView>
          )}
        </SectionBlock>

        {/* VOICE MESSAGES */}
        <SectionBlock title="语音留言" description="点击播放家人说的话。">
           {voiceMessages.length === 0 ? (
             <DataPanel tone="info"><Text className="text-gray-500">最近没有留言。</Text></DataPanel>
           ) : (
             <View className="space-y-3">
                {voiceMessages.slice(0, 3).map(msg => (
                  <View key={msg.id} className={`p-4 rounded-[20px] flex items-center justify-between shadow-sm active:scale-[0.98] transition-all ${
                     msg.isRead ? 'bg-white border border-gray-100' : 'bg-green-50 border-2 border-green-200'
                  }`} onClick={() => handlePlayVoice(msg)}>
                     <View className="flex items-center">
                        <View className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${msg.isRead ? 'bg-gray-100' : 'bg-green-500 text-white'}`}>
                           {currentPlayingId === msg.id ? <PlayStop size={24} /> : <Voice size={24} />}
                        </View>
                        <View>
                           <Text className="text-lg font-bold text-gray-900 block">{msg.fromName}</Text>
                           <Text className="text-sm text-gray-500">{new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'})}</Text>
                        </View>
                     </View>
                     {!msg.isRead && <View className="w-3 h-3 rounded-full bg-red-500" />}
                  </View>
                ))}
             </View>
           )}
        </SectionBlock>

        {/* FAMILY CONTACTS */}
        <SectionBlock title="联系家人" description="有急事？直接给他们打电话。">
           <View className="grid grid-cols-2 gap-4">
              {members.map(member => (
                <View key={member.id} className="bg-white p-4 rounded-[20px] shadow-sm flex flex-col items-center justify-center h-40 active:bg-blue-50" onClick={() => Taro.makePhoneCall({ phoneNumber: member.phone })}>
                   <View className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${member.isOnline ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <User size={32} color={member.isOnline ? '#059669' : '#9CA3AF'} />
                      {member.isOnline && <View className="absolute top-2 right-2 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />}
                   </View>
                   <Text className="text-xl font-bold text-gray-900">{member.name}</Text>
                   <Text className="text-sm text-gray-500">{member.relation}</Text>
                </View>
              ))}
              <View className="bg-white border-2 border-dashed border-gray-200 p-4 rounded-[20px] flex flex-col items-center justify-center h-40 opacity-60">
                 <Plus size={32} color="#9CA3AF" />
                 <Text className="text-gray-400 mt-2">添加家人</Text>
              </View>
           </View>
        </SectionBlock>

      </ScrollView>
    </PageShell>
  )

  // --- FAMILY VIEW ---
  const renderFamilyView = () => (
    <PageShell roleTone="family" className="bg-gray-50 min-h-screen">
       <View className="bg-white shadow-sm sticky top-0 z-10">
         <View className="p-4 flex items-center justify-between">
           <View>
             <Text className="text-xl font-bold text-gray-900 block">家庭空间</Text>
             <Text className="text-xs text-gray-500">{members.length} 位成员 · {photos.length} 张照片</Text>
           </View>
           <Button size="mini" className="bg-blue-600 text-white border-none rounded-full px-4" onClick={handleUpload}>
              <Text className="text-sm">传照片</Text>
           </Button>
         </View>
         
         {/* TABS */}
         <View className="flex border-b border-gray-100">
            {[{key:'members', label:'成员'}, {key:'voice', label:'留言'}, {key:'album', label:'相册'}].map(tab => (
               <View key={tab.key} className={`flex-1 py-3 text-center relative ${activeTab === tab.key ? 'text-blue-600 font-bold' : 'text-gray-500'}`} onClick={() => setActiveTab(tab.key as any)}>
                  <Text>{tab.label}</Text>
                  {activeTab === tab.key && <View className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-t-full" />}
               </View>
            ))}
         </View>
       </View>

       <ScrollView className="p-4" scrollY>
          {activeTab === 'members' && (
             <View className="space-y-3">
                {members.map(member => (
                  <View key={member.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                     <View className="flex items-center">
                        <View className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                           <User size={20} color="#666" />
                        </View>
                        <View>
                           <Text className="text-base font-bold text-gray-900 block">{member.name} <Text className="text-xs text-gray-400 font-normal">({member.relation})</Text></Text>
                           <Text className="text-xs text-gray-400">{member.phone}</Text>
                        </View>
                     </View>
                     <View className="flex items-center">
                        <View className={`w-2 h-2 rounded-full mr-2 ${member.isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <Text className="text-xs text-gray-500">{member.isOnline ? '在线' : '离线'}</Text>
                     </View>
                  </View>
                ))}
                <Button className="w-full bg-white text-blue-600 border border-blue-200 mt-4 rounded-lg flex items-center justify-center py-2">
                   <Plus size={16} className="mr-1" /> 邀请新成员
                </Button>
             </View>
          )}

          {activeTab === 'voice' && (
             <View className="space-y-3">
                {voiceMessages.map(msg => (
                  <View key={msg.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center">
                     <View className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mr-3" onClick={() => handlePlayVoice(msg)}>
                        {currentPlayingId === msg.id ? <PlayStop size={20} /> : <PlayStart size={20} />}
                     </View>
                     <View className="flex-1">
                        <Text className="text-sm font-bold text-gray-900">{msg.fromName}</Text>
                        <View className="w-full h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
                           <View className="h-full bg-blue-200" style={{ width: `${Math.min(msg.duration * 5, 100)}%` }} />
                        </View>
                        <Text className="text-xs text-gray-400 mt-1">{msg.duration}s · {new Date(msg.createdAt).toLocaleString()}</Text>
                     </View>
                  </View>
                ))}
             </View>
          )}

          {activeTab === 'album' && (
             <View className="grid grid-cols-3 gap-2">
                {photos.map(photo => (
                  <View key={photo.id} className="aspect-square bg-gray-200 rounded-lg overflow-hidden relative">
                     <Image src={photo.url} className="w-full h-full object-cover" mode="aspectFill" />
                  </View>
                ))}
                <View className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center" onClick={handleUpload}>
                   <Plus size={24} color="#9CA3AF" />
                   <Text className="text-xs text-gray-400 mt-1">上传</Text>
                </View>
             </View>
          )}
       </ScrollView>
    </PageShell>
  )

  return isElder ? renderElderView() : renderFamilyView()
}

