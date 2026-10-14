import { useEffect, useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView, Input, Button, Image } from '@tarojs/components'
import { Heart, Message, Service, Star, PlayStart, Clock } from '@nutui/icons-react-taro'
import { ActionGrid, DataPanel, EmptyState, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { getCompanionGames, getEmotionTrend, getNostalgiaContent, sendCompanionMessage } from '@/services/modules/companion'
import type { ChatMessage, CompanionGame, EmotionTrend, NostalgiaContent } from '@/services/types'
import { useRole } from '@/hooks/useRole'
import './index.scss'

const ELDER_GAMES = [
   { id: 'quiz', type: 'quiz', title: '健康小测验', description: '每天练一练，越用越灵光', icon: '🧠' },
   { id: 'music', type: 'music', title: '猜歌名', description: '听听这是哪首老歌？', icon: '🎵' },
   { id: 'memory', type: 'memory', title: '记数字', description: '简单好玩，锻炼记忆力', icon: '🔢' },
]

export default function AiCompanionIndex() {
  const { isElder } = useRole()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [games, setGames] = useState<CompanionGame[]>([])
  const [nostalgia, setNostalgia] = useState<NostalgiaContent[]>([])
  const [emotionTrend, setEmotionTrend] = useState<EmotionTrend[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Parallel data loading
    Promise.all([
      getCompanionGames(),
      getNostalgiaContent(),
      getEmotionTrend({ days: 7 })
    ]).then(([g, n, e]) => {
      setGames(g || [])
      setNostalgia(n || [])
      setEmotionTrend(e || [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleStartGame = (game: any) => {
    Taro.showToast({ title: '游戏即将开始...', icon: 'loading' })
    // Route to actual game page
  }

  // --- ELDER VIEW ---
  const renderElderView = () => (
    <PageShell roleTone="elder" className="bg-yinban-bg min-h-screen">
      <HeroHeader 
        roleTone="elder"
        eyebrow="情感陪伴"
        title="今天心情怎么样？"
        subtitle="我一直在这里陪着您，想聊天或是玩个小游戏都可以。"
      />

      <ScrollView className="flex-1 px-4 -mt-4 pb-20" scrollY>
         {/* Main Interactions */}
         <View className="grid grid-cols-2 gap-4 mb-6">
            <View className="bg-gradient-to-br from-pink-100 to-white p-6 rounded-3xl shadow-sm flex flex-col items-center justify-center active:scale-95 transition-transform" onClick={() => Taro.navigateTo({ url: '/subpackages/voice_ai/pages/index/index' })}>
               <View className="w-16 h-16 bg-pink-200 rounded-full flex items-center justify-center mb-3">
                  <Message size={32} className="text-pink-600" />
               </View>
               <Text className="text-xl font-bold text-gray-800">陪我聊天</Text>
               <Text className="text-sm text-gray-500 mt-1">随时都在</Text>
            </View>
            <View className="bg-gradient-to-br from-purple-100 to-white p-6 rounded-3xl shadow-sm flex flex-col items-center justify-center active:scale-95 transition-transform">
               <View className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center mb-3">
                  <Heart size={32} className="text-purple-600" />
               </View>
               <Text className="text-xl font-bold text-gray-800">今日关怀</Text>
               <Text className="text-sm text-gray-500 mt-1">听一句暖心话</Text>
            </View>
         </View>

         <SectionBlock title="轻松一刻" description="动动脑筋，保持活力">
            <View className="space-y-3">
               {ELDER_GAMES.map(game => (
                  <View key={game.id} className="bg-white p-4 rounded-2xl flex items-center shadow-sm active:bg-gray-50" onClick={() => handleStartGame(game)}>
                     <Text className="text-4xl mr-4">{game.icon}</Text>
                     <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-900 block">{game.title}</Text>
                        <Text className="text-gray-500 text-sm">{game.description}</Text>
                     </View>
                     <Button size="mini" className="bg-orange-100 text-orange-700 border-none rounded-full px-4 font-bold m-0">开始</Button>
                  </View>
               ))}
            </View>
         </SectionBlock>

         <SectionBlock title="岁月回响" description="看看当年的老照片和故事">
            <ScrollView scrollX className="whitespace-nowrap flex gap-4" showScrollbar={false}>
               {[1,2,3].map(i => (
                  <View key={i} className="inline-block w-40 h-56 bg-gray-200 rounded-2xl mr-3 relative overflow-hidden">
                     {/* Placeholder Images */}
                     <View className="absolute inset-0 bg-gray-300 flex items-center justify-center text-gray-400">老照片</View>
                     <View className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                        <Text className="text-white text-xs block">198{i}年的春天</Text>
                     </View>
                  </View>
               ))}
            </ScrollView>
         </SectionBlock>
      </ScrollView>
    </PageShell>
  )

  // --- FAMILY VIEW ---
  const renderFamilyView = () => (
    <PageShell roleTone="family" className="bg-gray-50 min-h-screen">
       <View className="bg-white p-4 pt-12 shadow-sm sticky top-0 z-10">
         <Text className="text-xl font-bold text-gray-900 block">情感与互动</Text>
         <Text className="text-sm text-gray-500">关注长辈的情绪变化与活跃度</Text>
       </View>

       <ScrollView className="p-4" scrollY>
          {/* Mood Trend */}
          <View className="bg-white p-5 rounded-2xl shadow-sm mb-4">
             <Text className="text-base font-bold text-gray-800 mb-4 block">本周情绪趋势</Text>
             {/* Simple visual representation of trend */}
             <View className="flex items-end justify-between h-32 px-2 border-b border-gray-100 pb-2">
                {[60, 70, 65, 80, 85, 90, 88].map((val, idx) => (
                   <View key={idx} className="flex flex-col items-center gap-1 group">
                      <View className="w-8 bg-pink-100 rounded-t-lg relative group-hover:bg-pink-200 transition-colors" style={{ height: `${val}%` }}>
                         <View className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {val}分
                         </View>
                      </View>
                      <Text className="text-xs text-gray-400">{['一','二','三','四','五','六','日'][idx]}</Text>
                   </View>
                ))}
             </View>
             <Text className="text-xs text-gray-400 mt-2 text-center">基于语音交互语气的AI分析</Text>
          </View>

          {/* Activity Log */}
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
             <View className="px-5 py-3 border-b border-gray-50">
                <Text className="font-bold text-gray-800">近期互动</Text>
             </View>
             {[1,2,3,4].map(i => (
                <View key={i} className="flex p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                   <View className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                      <Clock size={18} className="text-blue-500" />
                   </View>
                   <View className="flex-1">
                      <Text className="text-sm font-bold text-gray-900 block">完成了"健康小测验"</Text>
                      <Text className="text-xs text-gray-500 mt-1">10:2{i} · 正确率 100%</Text>
                   </View>
                </View>
             ))}
          </View>
       </ScrollView>
    </PageShell>
  )

  return isElder ? renderElderView() : renderFamilyView()
}
