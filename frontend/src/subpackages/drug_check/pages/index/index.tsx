import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Input } from '@tarojs/components'
import { Search, ShieldCheck, Warning } from '@nutui/icons-react-taro'
import { DataPanel, EmptyState, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { acknowledgeRisk, checkContraindication, checkDrugInteraction, checkFoodInteraction, getInteractionHistory } from '@/services/modules/drug_interaction'
import type { DrugContraindication, DrugFoodInteraction, DrugInteractionRecord, DrugInteractionResult } from '@/services/types'
import './index.scss'

const levelToneMap: Record<string, 'danger' | 'warning' | 'info' | 'success'> = { X: 'danger', D: 'danger', C: 'warning', B: 'info', A: 'success' }

export default function DrugCheckIndex() {
  const [drugInput, setDrugInput] = useState('')
  const [drugList, setDrugList] = useState<string[]>([])
  const [results, setResults] = useState<DrugInteractionResult[]>([])
  const [history, setHistory] = useState<DrugInteractionRecord[]>([])
  const [contra, setContra] = useState<DrugContraindication[]>([])
  const [food, setFood] = useState<DrugFoodInteraction[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { getInteractionHistory().then(setHistory).catch(() => setHistory([])) }, [])

  const handleAddDrug = () => {
    const value = drugInput.trim()
    if (!value || drugList.includes(value)) return
    setDrugList(prev => [...prev, value])
    setDrugInput('')
  }

  const handleCheck = async () => {
    if (drugList.length < 2) return
    setLoading(true)
    try {
      const [interaction, contraData, foodData] = await Promise.all([
        checkDrugInteraction({ drugList }),
        checkContraindication({ drugName: drugList[0] }),
        checkFoodInteraction({ drugName: drugList[0] }),
      ])
      setResults(interaction || [])
      setContra(contraData || [])
      setFood(foodData || [])
    } catch (error) {
      console.error('drug interaction check failed', error)
      setResults([])
      setContra([])
      setFood([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell roleTone="family" className="drug-page">
      <HeroHeader roleTone="family" eyebrow="药物相互作用" title="先排除高风险，再决定怎么吃" subtitle="把联用风险、禁忌和食物提醒收在同一屏，不再拆成多个思路。" />
      <ScrollView className="detail-shell-scroll" scrollY>
        <SectionBlock title="快速检查" description="输入两种及以上药物名称，先做一轮基础筛查。">
          <DataPanel tone="primary">
            <Text className="detail-label">药物名称</Text>
            <Input className="detail-input" value={drugInput} placeholder="输入药名后点击加入" onInput={e => setDrugInput(e.detail.value)} confirmType="done" onConfirm={handleAddDrug} />
            <View className="detail-actions">
              <View className="detail-button detail-button--family-primary" onClick={handleAddDrug}><Text>加入</Text></View>
              <View className="detail-button detail-button--family" onClick={handleCheck}><Text>{loading ? '检查中...' : '开始检查'}</Text></View>
            </View>
            <View className="detail-chip-row">{drugList.map(item => <View key={item} className="detail-chip detail-chip--family-active" onClick={() => setDrugList(prev => prev.filter(name => name !== item))}><Text>{item}</Text></View>)}</View>
          </DataPanel>
        </SectionBlock>

        <SectionBlock title="联用风险" description="优先显示最需要家属和长辈注意的组合。">
          {results.length === 0 ? <EmptyState title="还没有联用结果" description="至少加入两种药物后才能开始判断相互作用。" icon={<Search size={28} />} /> : <View className="detail-stack">{results.map((item, index) => <DataPanel key={`${item.drugA}-${item.drugB}-${index}`} tone={levelToneMap[item.level] || 'info'}><Text className="detail-title">{item.drugA} + {item.drugB}</Text><Text className="detail-text">风险等级 {item.level}，{item.description || '建议进一步确认医生或药师意见。'}</Text><Text className="detail-meta">{item.mechanism || '当前接口未返回详细机制说明。'}</Text></DataPanel>)}</View>}
        </SectionBlock>

        <SectionBlock title="禁忌与食物提醒" description="默认以第一个药物为主做快速补充判断。">
          <View className="detail-stack">
            {contra.map((item, index) => <DataPanel key={`${item.drugName}-${index}`} tone={item.severity === 'high' ? 'danger' : item.severity === 'medium' ? 'warning' : 'info'}><Text className="detail-title">{item.drugName} · {item.diseaseName}</Text><Text className="detail-text">{item.description || '存在用药禁忌，请结合既往疾病史复核。'}</Text></DataPanel>)}
            {food.map((item, index) => <DataPanel key={`${item.foodName}-${index}`} tone="warning"><Text className="detail-title">食物提醒：{item.foodName}</Text><Text className="detail-text">{item.description || item.suggestion || '建议避开同服。'}</Text></DataPanel>)}
            {contra.length === 0 && food.length === 0 ? <EmptyState title="暂无禁忌补充结果" description="接口没有返回额外提醒时，会优先展示联用结果。" icon={<ShieldCheck size={28} />} /> : null}
          </View>
        </SectionBlock>

        <SectionBlock title="最近处理记录" description="后台和小程序保持同样的风险处理闭环。">
          {history.length === 0 ? <EmptyState title="还没有历史记录" description="完成一次检查后，记录会出现在这里。" icon={<Warning size={28} />} /> : <View className="detail-stack">{history.slice(0, 6).map(item => <DataPanel key={item.id} tone={item.level === 'X' || item.level === 'D' ? 'danger' : item.level === 'C' ? 'warning' : 'info'}><Text className="detail-title">{item.drugA} + {item.drugB}</Text><Text className="detail-text">等级 {item.level} · 状态 {item.status}</Text><View className="detail-actions">{item.status === 'new' ? <View className="detail-button detail-button--family-primary" onClick={() => acknowledgeRisk({ interactionId: item.id }).then(() => setHistory(prev => prev.map(row => row.id === item.id ? { ...row, status: 'acknowledged' } : row)))}><Text>标记已知晓</Text></View> : null}</View></DataPanel>)}</View>}
        </SectionBlock>
        <View className="detail-bottom-space" />
      </ScrollView>
      <StickyPrimaryAction tone="family" label="开始药物筛查" icon={<Search size={22} />} onClick={handleCheck} />
    </PageShell>
  )
}
