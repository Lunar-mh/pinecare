import { useCallback, useEffect, useState } from 'react'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { Text, View, ScrollView, Button, Image } from '@tarojs/components'
import { Clock, Service, Star, Check, Plus, ArrowRight } from '@nutui/icons-react-taro'
import { DataPanel, HeroHeader, PageShell, SectionBlock, EmptyState, StickyPrimaryAction } from '@/components/shell'
import { getServiceRequests, getTimeBankAccount, getTimeBankTransactions } from '@/services/modules/timebank'
import type { ServiceRequest, TimeBankAccount } from '@/services/types'
import { useRole } from '@/hooks/useRole'
import './index.scss'

type TxItem = {
  id: string
  type: 'earn' | 'spend'
  amount: number
  description: string
  createdAt: string
}

export default function TimeBankIndex() {
  const { isElder } = useRole()
  const [account, setAccount] = useState<TimeBankAccount | null>(null)
  const [services, setServices] = useState<ServiceRequest[]>([])
  const [transactions, setTransactions] = useState<TxItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [accountRes, serviceRes, transactionRes] = await Promise.all([
        getTimeBankAccount(),
        getServiceRequests({ page: 1, pageSize: 5 }),
        getTimeBankTransactions({ page: 1, pageSize: 5 }),
      ])
      
      // Fix types later if needed
      setAccount(accountRes || { balance: 0, frozen: 0, level: 1 })
      setServices(serviceRes?.list || [])
      setTransactions((transactionRes?.list || []) as TxItem[])
      
    } catch (e) {
      console.error('load timebank failed', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  usePullDownRefresh(() => {
    loadData().finally(() => Taro.stopPullDownRefresh())
  })

  // --- ELDER VIEW ---
  const renderElderView = () => (
    <PageShell roleTone="elder" className="bg-yinban-bg min-h-screen">
      <HeroHeader
        roleTone="elder"
        eyebrow="时间银行"
        title="我的服务分"
        subtitle="可以用这些时间分兑换志愿者上门服务。"
        aside={
           <View className="bg-white/20 px-4 py-2 rounded-xl text-center">
              <Text className="text-white text-3xl font-bold block leading-none">{account?.balance || 0}</Text>
              <Text className="text-white/80 text-xs mt-1 block">当前可用</Text>
           </View>
        }
      />

      <ScrollView className="flex-1 px-4 py-2 -mt-6" scrollY>
         {/* Active Requests */}
         {services.filter(s => s.status === 'pending' || s.status === 'assigned').length > 0 && (
            <View className="mb-6">
               <Text className="text-xl font-bold text-gray-800 mb-4 block px-1">正在进行</Text>
               {services.filter(s => s.status === 'pending' || s.status === 'assigned').map(svc => (
                  <View key={svc.id} className="bg-white rounded-[24px] p-6 shadow-sm mb-4 border-l-8 border-orange-400">
                     <Text className="text-2xl font-bold text-gray-900 mb-2 block">{svc.serviceType}</Text>
                     <Text className="text-lg text-gray-500 mb-4">{new Date(svc.scheduledTime).toLocaleDateString()} 上门</Text>
                     <View className="bg-orange-50 text-orange-700 px-4 py-2 rounded-xl text-center font-bold">
                        {svc.status === 'pending' ? '等待志愿者接单' : '志愿者正在赶来'}
                     </View>
                  </View>
               ))}
            </View>
         )}

         {/* Actions */}
         <View className="grid grid-cols-2 gap-4 mb-8">
            <View className="bg-white p-6 rounded-[24px] shadow-sm flex flex-col items-center justify-center active:bg-gray-50 transition-colors" onClick={() => Taro.navigateTo({ url: '/subpackages/timebank/pages/service/create' })}>
               <View className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <Service size={32} className="text-blue-600" />
               </View>
               <Text className="text-xl font-bold text-gray-900">预约上门</Text>
               <Text className="text-sm text-gray-500 mt-1">保洁/看护/陪聊</Text>
            </View>
            <View className="bg-white p-6 rounded-[24px] shadow-sm flex flex-col items-center justify-center active:bg-gray-50 transition-colors">
               <View className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <Clock size={32} className="text-green-600" />
               </View>
               <Text className="text-xl font-bold text-gray-900">我的存折</Text>
               <Text className="text-sm text-gray-500 mt-1">查看详细记录</Text>
            </View>
         </View>
      </ScrollView>
    </PageShell>
  )

  // --- FAMILY VIEW ---
  const renderFamilyView = () => (
    <PageShell roleTone="family" className="bg-gray-50 min-h-screen">
       <View className="bg-white p-4 pt-12 shadow-sm sticky top-0 z-10 flex justify-between items-center">
         <View>
           <Text className="text-xl font-bold text-gray-900 block">时间银行账户</Text>
           <Text className="text-xs text-gray-500">余额 {account?.balance || 0} 时间币</Text>
         </View>
         <Button size="mini" className="bg-orange-50 text-orange-600 border-none rounded-full px-4 text-xs font-bold m-0" onClick={() => Taro.navigateTo({ url: '/subpackages/timebank/pages/service/create' })}>
            代预约服务
         </Button>
       </View>

       <ScrollView className="p-4" scrollY>
          {/* Recent Usage */}
          <SectionBlock title="服务记录" description="近期预约的服务状态">
             {services.length === 0 ? (
                <View className="text-center py-8 text-gray-400 text-sm bg-white rounded-xl">暂无服务记录</View>
             ) : (
                <View className="space-y-3">
                   {services.map(svc => (
                      <View key={svc.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
                         <View>
                            <Text className="font-bold text-gray-900 block">{svc.serviceType}</Text>
                            <Text className="text-xs text-gray-500">{new Date(svc.scheduledTime).toLocaleString()}</Text>
                         </View>
                         <Text className={`text-xs px-2 py-1 rounded ${
                            svc.status === 'completed' ? 'bg-green-100 text-green-700' : 
                            svc.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                         }`}>
                            {svc.status === 'completed' ? '已完成' : svc.status === 'pending' ? '待接单' : svc.status}
                         </Text>
                      </View>
                   ))}
                </View>
             )}
          </SectionBlock>

          <View className="h-6" />

          {/* Transaction Log */}
          <SectionBlock title="收支明细" description="时间币流向">
             <View className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
                {transactions.map(tx => (
                   <View key={tx.id} className="p-4 flex justify-between items-center">
                      <View>
                         <Text className="text-sm text-gray-900 block font-medium">{tx.description}</Text>
                         <Text className="text-xs text-gray-400">{tx.createdAt.split('T')[0]}</Text>
                      </View>
                      <Text className={`font-mono font-bold ${tx.type === 'earn' ? 'text-green-600' : 'text-red-500'}`}>
                         {tx.type === 'earn' ? '+' : '-'}{tx.amount}
                      </Text>
                   </View>
                ))}
             </View>
          </SectionBlock>
       </ScrollView>
    </PageShell>
  )

  return isElder ? renderElderView() : renderFamilyView()
}
