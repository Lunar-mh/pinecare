import { useCallback, useEffect, useState } from 'react'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { Text, View, ScrollView } from '@tarojs/components'
import { Clock } from '@nutui/icons-react-taro'
import { DataPanel, HeroHeader, PageShell, SectionBlock, EmptyState } from '@/components/shell'
import { getServiceRequests, getTimeBankAccount, getTimeBankTransactions } from '@/services/modules/timebank'
import type { ServiceRequest, TimeBankAccount } from '@/services/types'
import './index.scss'

type TxItem = {
  id: string
  type: 'earn' | 'spend'
  amount: number
  description: string
  createdAt: string
}

export default function TimeBankIndex() {
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
      setAccount(accountRes)
      setServices(serviceRes.list || [])
      setTransactions((transactionRes.list || []) as TxItem[])
    } catch (error) {
      console.error('load time bank page failed', error)
      setAccount(null)
      setServices([])
      setTransactions([])
      Taro.showToast({ title: '时间银行数据加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])
  usePullDownRefresh(() => {
    loadData().finally(() => Taro.stopPullDownRefresh())
  })

  return (
    <PageShell roleTone="family" className="timebank-moved-page" loading={loading}>
      <HeroHeader
        roleTone="family"
        eyebrow="时间银行"
        title="时间币账户与服务记录"
        subtitle="本页数据由后端实时接口返回，包含账户余额、服务历史与兑换记录。"
      />

      <ScrollView className="detail-shell-scroll" scrollY>
        <SectionBlock title="账户概览" description="展示当前时间币余额与累计收支。">
          {!account ? (
            <EmptyState
              title="暂时没有账户数据"
              description="请稍后下拉重试。"
              icon={<Clock size={28} />}
            />
          ) : (
            <View className="detail-stack">
              <DataPanel tone="primary">
                <Text className="detail-title">当前余额 {account.balance}</Text>
                <Text className="detail-text">累计获得 {account.totalEarned} · 累计支出 {account.totalSpent}</Text>
                <Text className="detail-meta">信用等级 {account.title}</Text>
              </DataPanel>
            </View>
          )}
        </SectionBlock>

        <SectionBlock title="最近服务记录" description="展示最近参与的时间银行服务。">
          {services.length === 0 ? (
            <EmptyState
              title="暂无服务记录"
              description="后续产生服务记录后会自动展示。"
              icon={<Clock size={28} />}
            />
          ) : (
            <View className="detail-stack">
              {services.map(item => (
                <DataPanel key={item.id} tone={item.status === 'completed' ? 'success' : 'info'}>
                  <Text className="detail-title">{item.type}</Text>
                  <Text className="detail-text">时长 {item.duration} 小时 · 状态 {item.status}</Text>
                  <Text className="detail-meta">{new Date(item.createdAt).toLocaleString('zh-CN')}</Text>
                </DataPanel>
              ))}
            </View>
          )}
        </SectionBlock>

        <SectionBlock title="最近兑换记录" description="展示时间币兑换流水。">
          {transactions.length === 0 ? (
            <EmptyState
              title="暂无兑换记录"
              description="后续兑换后会在这里显示。"
              icon={<Clock size={28} />}
            />
          ) : (
            <View className="detail-stack">
              {transactions.map(item => (
                <DataPanel key={item.id} tone={item.type === 'spend' ? 'warning' : 'success'}>
                  <Text className="detail-title">{item.description}</Text>
                  <Text className="detail-text">{item.type === 'spend' ? '支出' : '获得'} {item.amount} 时间币</Text>
                  <Text className="detail-meta">{new Date(item.createdAt).toLocaleString('zh-CN')}</Text>
                </DataPanel>
              ))}
            </View>
          )}
        </SectionBlock>
      </ScrollView>
    </PageShell>
  )
}
