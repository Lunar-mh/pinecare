import { useCallback, useEffect, useMemo, useState } from 'react'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { Check, Clock, List, Plus, Warning } from '@nutui/icons-react-taro'
import {
  DataPanel,
  EmptyState,
  HeroHeader,
  PageShell,
  SectionBlock,
  StatusCard,
  StickyPrimaryAction,
} from '@/components/shell'
import {
  deleteMedication,
  getMedications,
  getTodayMedications,
  markMedicationTaken,
  skipMedication,
  updateMedication,
} from '@/services/modules/medication'
import type { Medication, TodayMedication } from '@/services/types'
import './index.scss'

type MedicationTab = 'today' | 'plan'

export default function MedicationIndex() {
  const [activeTab, setActiveTab] = useState<MedicationTab>('today')
  const [todayMeds, setTodayMeds] = useState<TodayMedication[]>([])
  const [plans, setPlans] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [today, medicationPlans] = await Promise.all([getTodayMedications(), getMedications()])
      setTodayMeds(today || [])
      setPlans(medicationPlans || [])
    } catch (loadError) {
      console.error('load medication page failed', loadError)
      setError('用药计划暂时没有加载成功，请稍后再试。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  usePullDownRefresh(() => {
    loadData().finally(() => Taro.stopPullDownRefresh())
  })

  const pendingMeds = todayMeds.filter(item => item.status === 'pending')
  const takenMeds = todayMeds.filter(item => item.status === 'taken')
  const missedMeds = todayMeds.filter(item => item.status === 'missed')
  const skippedMeds = todayMeds.filter(item => item.status === 'skipped')
  const activePlans = plans.filter(item => item.isActive)

  const progress = useMemo(() => {
    if (todayMeds.length === 0) return 0
    return Math.round((takenMeds.length / todayMeds.length) * 100)
  }, [takenMeds.length, todayMeds.length])

  const handleTake = async (item: TodayMedication) => {
    if (!item.logId) {
      Taro.showToast({ title: '当前记录缺少日志标识', icon: 'none' })
      return
    }
    try {
      await markMedicationTaken(item.logId)
      Taro.showToast({ title: '已记录服药', icon: 'success' })
      loadData()
    } catch (takeError) {
      console.error('mark medication taken failed', takeError)
      Taro.showToast({ title: '记录失败，请稍后重试', icon: 'none' })
    }
  }

  const handleSkip = async (item: TodayMedication) => {
    if (!item.logId) {
      Taro.showToast({ title: '当前记录缺少日志标识', icon: 'none' })
      return
    }
    try {
      await skipMedication(item.logId, '用户手动跳过')
      Taro.showToast({ title: '已标记跳过', icon: 'success' })
      loadData()
    } catch (skipError) {
      console.error('skip medication failed', skipError)
      Taro.showToast({ title: '操作失败，请稍后再试', icon: 'none' })
    }
  }

  const handleTogglePlan = async (plan: Medication) => {
    try {
      await updateMedication(plan.id, { isActive: !plan.isActive })
      setPlans(prev => prev.map(item => (item.id === plan.id ? { ...item, isActive: !item.isActive } : item)))
    } catch (toggleError) {
      console.error('toggle medication plan failed', toggleError)
      Taro.showToast({ title: '切换失败，请稍后重试', icon: 'none' })
    }
  }

  const handleDeletePlan = (plan: Medication) => {
    Taro.showModal({
      title: '删除用药计划',
      content: `确认删除“${plan.name}”吗？删除后今天的提醒也会一起失效。`,
      confirmColor: '#d75a4a',
      success: async res => {
        if (!res.confirm) return
        try {
          await deleteMedication(plan.id)
          setPlans(prev => prev.filter(item => item.id !== plan.id))
          Taro.showToast({ title: '计划已删除', icon: 'success' })
        } catch (deleteError) {
          console.error('delete medication plan failed', deleteError)
          Taro.showToast({ title: '删除失败，请稍后再试', icon: 'none' })
        }
      },
    })
  }

  return (
    <PageShell roleTone="elder" className="medication-overview-page">
      <HeroHeader
        roleTone="elder"
        eyebrow="用药提醒"
        title="今天的服药节奏一眼看清"
        subtitle="先看今天有没有漏服，再看计划是否需要暂停、补充或调整。"
        aside={
          <View className="medication-overview-page__progress-ring">
            <Text>{progress}%</Text>
          </View>
        }
      />

      <ScrollView className="medication-overview-page__scroll" scrollY>
        <View className="medication-overview-page__grid">
          <StatusCard title="待服药" value={`${pendingMeds.length}`} unit="次" hint="优先处理接下来要吃的药" tone={pendingMeds.length > 0 ? 'warning' : 'success'} icon={<Clock size={22} />} />
          <StatusCard title="已完成" value={`${takenMeds.length}`} unit="次" hint="今天已经确认完成的次数" tone="success" icon={<Check size={22} />} />
          <StatusCard title="生效计划" value={`${activePlans.length}`} unit="项" hint="目前正在运行的长期计划" tone="primary" icon={<List size={22} />} />
        </View>

        <View className="medication-overview-page__tabs">
          <View className={`medication-overview-page__tab${activeTab === 'today' ? ' medication-overview-page__tab--active' : ''}`} onClick={() => setActiveTab('today')}>
            <Text>今天安排</Text>
          </View>
          <View className={`medication-overview-page__tab${activeTab === 'plan' ? ' medication-overview-page__tab--active' : ''}`} onClick={() => setActiveTab('plan')}>
            <Text>长期计划</Text>
          </View>
        </View>

        {error ? <EmptyState title="页面暂时不可用" description={error} actionLabel="重新加载" onAction={loadData} icon={<Warning size={28} />} /> : null}

        {activeTab === 'today' ? (
          <SectionBlock title="今天安排" description="按照时间顺序处理，减少遗漏。">
            {loading ? (
              <DataPanel tone="info"><Text className="medication-overview-page__panel-text">正在整理今天的服药提醒...</Text></DataPanel>
            ) : todayMeds.length === 0 ? (
              <EmptyState title="今天没有服药提醒" description="如果需要添加新的长期计划，可以直接从底部入口创建。" icon={<Check size={28} />} />
            ) : (
              <View className="medication-overview-page__stack">
                {pendingMeds.map(item => (
                  <DataPanel key={`${item.medicationId}-${item.time}`} tone="warning">
                    <Text className="medication-overview-page__item-title">{item.time} {item.name}</Text>
                    <Text className="medication-overview-page__item-desc">{item.dosage}</Text>
                    <View className="medication-overview-page__actions">
                      <View className="medication-overview-page__btn medication-overview-page__btn--primary" onClick={() => handleTake(item)}><Text>确认已服</Text></View>
                      <View className="medication-overview-page__btn" onClick={() => handleSkip(item)}><Text>稍后处理</Text></View>
                    </View>
                  </DataPanel>
                ))}
                {takenMeds.map(item => (
                  <DataPanel key={`${item.medicationId}-${item.time}-taken`} tone="success">
                    <Text className="medication-overview-page__item-title">{item.time} {item.name}</Text>
                    <Text className="medication-overview-page__item-desc">已确认完成，剂量 {item.dosage}</Text>
                  </DataPanel>
                ))}
                {missedMeds.map(item => (
                  <DataPanel key={`${item.medicationId}-${item.time}-missed`} tone="danger">
                    <Text className="medication-overview-page__item-title">{item.time} {item.name}</Text>
                    <Text className="medication-overview-page__item-desc">这次提醒已经超时，建议尽快确认是否补服。</Text>
                    <View className="medication-overview-page__actions">
                      <View className="medication-overview-page__btn medication-overview-page__btn--primary" onClick={() => handleTake(item)}><Text>补记服药</Text></View>
                    </View>
                  </DataPanel>
                ))}
                {skippedMeds.map(item => (
                  <DataPanel key={`${item.medicationId}-${item.time}-skipped`} tone="info">
                    <Text className="medication-overview-page__item-title">{item.time} {item.name}</Text>
                    <Text className="medication-overview-page__item-desc">这次提醒已被标记为稍后处理，可在需要时重新确认。</Text>
                    <View className="medication-overview-page__actions">
                      <View className="medication-overview-page__btn medication-overview-page__btn--primary" onClick={() => handleTake(item)}><Text>补记服药</Text></View>
                    </View>
                  </DataPanel>
                ))}
              </View>
            )}
          </SectionBlock>
        ) : (
          <SectionBlock title="长期计划" description="把启用和停用操作收敛到同一处。">
            {loading ? (
              <DataPanel tone="info"><Text className="medication-overview-page__panel-text">正在同步长期用药计划...</Text></DataPanel>
            ) : plans.length === 0 ? (
              <EmptyState title="还没有长期计划" description="添加后，首页和提醒页会自动同步更新。" icon={<List size={28} />} />
            ) : (
              <View className="medication-overview-page__stack">
                {plans.map(plan => (
                  <DataPanel key={plan.id} tone={plan.isActive ? 'primary' : 'info'}>
                    <Text className="medication-overview-page__item-title">{plan.name}</Text>
                    <Text className="medication-overview-page__item-desc">{plan.dosage} · {plan.frequency}</Text>
                    <Text className="medication-overview-page__item-meta">{(plan.schedule || []).map(item => item.time).join(' / ') || '08:00'}</Text>
                    <View className="medication-overview-page__actions">
                      <View className="medication-overview-page__btn medication-overview-page__btn--primary" onClick={() => handleTogglePlan(plan)}><Text>{plan.isActive ? '暂停计划' : '重新启用'}</Text></View>
                      <View className="medication-overview-page__btn medication-overview-page__btn--danger" onClick={() => handleDeletePlan(plan)}><Text>删除</Text></View>
                    </View>
                  </DataPanel>
                ))}
              </View>
            )}
          </SectionBlock>
        )}

        <View className="medication-overview-page__bottom-space" />
      </ScrollView>

      <StickyPrimaryAction tone="elder" label="新增用药计划" icon={<Plus size={22} />} onClick={() => Taro.navigateTo({ url: '/subpackages/medication/pages/add/index' })} />
    </PageShell>
  )
}
