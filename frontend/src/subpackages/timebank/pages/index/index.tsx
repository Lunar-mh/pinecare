import { useCallback, useEffect, useState } from 'react'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { View, Text, ScrollView, Input } from '@tarojs/components'
import { Clock, Gift, Service } from '@nutui/icons-react-taro'
import { DataPanel, EmptyState, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { acceptServiceRequest, getServiceRequests, getTimeBankAccount, getTimeBankTransactions } from '@/services/modules/timebank'
import type { ServiceRequest, TimeBankAccount } from '@/services/types'
import './index.scss'

type Transaction = { id: string; type: 'earn' | 'spend'; amount: number; description: string; counterpart?: string; createdAt: string }

export default function TimeBankIndex() {
  const [account, setAccount] = useState<TimeBankAccount | null>(null)
  const [services, setServices] = useState<ServiceRequest[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [accountData, serviceData, transactionData] = await Promise.all([
        getTimeBankAccount(),
        getServiceRequests({ page: 1, pageSize: 6, status: 'open' }),
        getTimeBankTransactions({ page: 1, pageSize: 6 }),
      ])
      setAccount(accountData)
      setServices(serviceData?.list || [])
      setTransactions((transactionData?.list || []) as Transaction[])
    } catch (error) {
      console.error('load time bank page failed', error)
      setAccount(null)
      setServices([])
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])
  usePullDownRefresh(() => { loadData().finally(() => Taro.stopPullDownRefresh()) })

  const filteredServices = services.filter(item => !keyword || `${item.type}${item.description}${item.location}`.includes(keyword))

  return (
    <PageShell roleTone="family" className="timebank-overview-page">
      <HeroHeader roleTone="family" eyebrow="时间银行" title="把服务、积分和流水收成一个账户体验" subtitle="从‘服务大厅’切成更清楚的账户视角，先看余额，再决定接单或兑换。" />
      <ScrollView className="detail-shell-scroll" scrollY>
        <SectionBlock title="账户余额" description="先确认还能服务多久、最近变化如何。">
          {!account ? <EmptyState title="暂未同步账户信息" description="后端返回后这里会显示累计服务时长和等级。" icon={<Gift size={28} />} /> : <View className="detail-stack"><DataPanel tone="primary"><Text className="detail-title">当前余额 {account.balance} 分钟</Text><Text className="detail-text">累计获得 {account.totalEarned} 分钟 · 已支出 {account.totalSpent} 分钟</Text><Text className="detail-meta">等级 Lv.{account.level} · {account.title}</Text></DataPanel></View>}
        </SectionBlock>

        <SectionBlock title="服务大厅" description="按关键字快速看附近和适合接单的服务。">
          <DataPanel tone="info">
            <Text className="detail-label">快速筛选</Text>
            <Input className="detail-input" value={keyword} placeholder="输入服务类型、描述或地点" onInput={e => setKeyword(e.detail.value)} />
          </DataPanel>
          {loading ? <DataPanel tone="info"><Text className="detail-text">正在同步服务大厅...</Text></DataPanel> : filteredServices.length === 0 ? <EmptyState title="当前没有可接服务" description="可以稍后再看，或从后台查看新的服务需求。" icon={<Service size={28} />} /> : <View className="detail-stack">{filteredServices.map(item => <DataPanel key={item.id} tone="warning"><Text className="detail-title">{item.type}</Text><Text className="detail-text">{item.description}</Text><Text className="detail-meta">{item.location} · {item.duration} 分钟</Text><View className="detail-actions"><View className="detail-button detail-button--family-primary" onClick={() => acceptServiceRequest(item.id).then(loadData)}><Text>接单</Text></View></View></DataPanel>)}</View>}
        </SectionBlock>

        <SectionBlock title="最近流水" description="对账只保留最近变化，避免信息过载。">
          {transactions.length === 0 ? <EmptyState title="还没有积分流水" description="完成服务或兑换后，这里会出现记录。" icon={<Clock size={28} />} /> : <View className="detail-stack">{transactions.map(item => <DataPanel key={item.id} tone={item.type === 'earn' ? 'success' : 'info'}><Text className="detail-title">{item.description}</Text><Text className="detail-text">{item.type === 'earn' ? '+' : '-'}{item.amount} 分钟</Text><Text className="detail-meta">{item.counterpart || '系统记录'} · {new Date(item.createdAt).toLocaleString('zh-CN')}</Text></DataPanel>)}</View>}
        </SectionBlock>
        <View className="detail-bottom-space" />
      </ScrollView>
      <StickyPrimaryAction tone="family" label="查看可接服务" icon={<Service size={22} />} onClick={() => Taro.pageScrollTo({ scrollTop: 400, duration: 200 })} />
    </PageShell>
  )
}

