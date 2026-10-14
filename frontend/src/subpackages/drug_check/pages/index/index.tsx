import { useEffect, useState, useCallback } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView, Input, Button, Image } from '@tarojs/components'
import { Search, ShieldCheck, Warning, Scan, Photograph, Microphone, Close } from '@nutui/icons-react-taro'
import { Tag, Skeleton, Empty } from '@nutui/nutui-react-taro'
import { DataPanel, EmptyState, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { acknowledgeRisk, checkContraindication, checkDrugInteraction, checkFoodInteraction, getInteractionHistory } from '@/services/modules/drug_interaction'
import type { DrugContraindication, DrugFoodInteraction, DrugInteractionRecord, DrugInteractionResult } from '@/services/types'
import { useRole } from '@/hooks/useRole'
import './index.scss'

// 结果类型
type CheckResult = {
  type: 'safe' | 'warning' | 'danger';
  title: string;
  message: string;
  details?: string[];
}

export default function DrugCheckIndex() {
  const { isElder } = useRole()
  const [drugInput, setDrugInput] = useState('')
  const [results, setResults] = useState<CheckResult[]>([])
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [history, setHistory] = useState<DrugInteractionRecord[]>([])

  // 加载历史记录（家属端）
  const loadHistory = useCallback(async () => {
    if (isElder) return
    setHistoryLoading(true)
    try {
      const data = await getInteractionHistory({ limit: 10 })
      setHistory(data || [])
    } catch (e) {
      console.error('load history failed', e)
    } finally {
      setHistoryLoading(false)
    }
  }, [isElder])

  useEffect(() => { loadHistory() }, [loadHistory])

  const handleCheck = async () => {
    if (!drugInput.trim()) return
    setLoading(true)
    
    try {
      const result = await checkDrugInteraction({ drugName: drugInput.trim() })
      
      if (result.hasInteraction) {
        setResults([{
          type: result.severity === 'high' ? 'danger' : 'warning',
          title: result.severity === 'high' ? '有严重风险' : '需要注意',
          message: result.description || '发现潜在药物相互作用',
          details: result.recommendations || [],
        }])
      } else {
        setResults([{
          type: 'safe',
          title: '可以放心吃',
          message: '暂未发现与您当前正在吃的药有冲突。',
        }])
      }
    } catch (e) {
      console.error('drug check failed', e)
      // API失败时显示错误，而非假装安全
      setResults([{
        type: 'warning',
        title: '无法查询',
        message: '网络连接问题，请稍后重试或咨询医生。',
        details: ['请确保网络连接正常', '如有疑问请联系医生'],
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleScan = () => {
    Taro.scanCode({
      success: (res) => {
        setDrugInput(res.result)
        handleCheck()
      },
      fail: () => {
        Taro.showToast({ title: '扫码取消', icon: 'none' })
      }
    })
  }

  const handleTakePhoto = () => {
    Taro.chooseImage({
      count: 1,
      sourceType: ['camera'],
      success: async (res) => {
        Taro.showLoading({ title: '识别中...' })
        try {
          // 调用OCR识别API
          const filePath = res.tempFilePaths[0]
          // TODO: 实际项目中应调用后端OCR服务
          // const ocrResult = await ocrService.recognizeDrug(filePath)
          // setDrugInput(ocrResult.drugName)
          
          Taro.hideLoading()
          Taro.showToast({ title: '请手动输入药品名', icon: 'none' })
        } catch (e) {
          Taro.hideLoading()
          Taro.showToast({ title: 'OCR识别暂不可用', icon: 'none' })
        }
      }
    })
  }

  const clearResults = () => {
    setResults([])
    setDrugInput('')
  }

  // --- ELDER VIEW (简化只读版) ---
  const renderElderView = () => (
    <PageShell roleTone="elder" className="bg-elder-canvas min-h-screen">
      <HeroHeader 
        roleTone="elder"
        eyebrow="用药查询"
        title="这个能不能吃？"
        subtitle="拍个照，或者扫一扫药盒，帮您看看有没有冲突。"
      />

      <ScrollView className="flex-1 px-4 -mt-4 pb-8" scrollY>
        {/* 大按钮操作区 */}
        <View className="grid grid-cols-2 gap-4 mb-6">
          <View 
            className="bg-white p-6 rounded-bento shadow-bento flex flex-col items-center justify-center active:scale-[0.97] transition-transform min-h-[160px]" 
            onClick={handleScan}
          >
            <View className="w-20 h-20 bg-family-primary-soft rounded-full flex items-center justify-center mb-4">
              <Scan size={40} color="#3B82F6" />
            </View>
            <Text className="text-elder-body font-bold text-elder-text-primary">扫药盒条码</Text>
          </View>
          <View 
            className="bg-white p-6 rounded-bento shadow-bento flex flex-col items-center justify-center active:scale-[0.97] transition-transform min-h-[160px]"
            onClick={handleTakePhoto}
          >
            <View className="w-20 h-20 bg-elder-success-soft rounded-full flex items-center justify-center mb-4">
              <Photograph size={40} color="#43A047" />
            </View>
            <Text className="text-elder-body font-bold text-elder-text-primary">拍药名</Text>
          </View>
        </View>

        {/* 加载状态 */}
        {loading && (
          <View className="bg-white rounded-bento p-6 shadow-bento mb-6">
            <View className="flex items-center justify-center">
              <View className="loading-spinner mr-3" />
              <Text className="text-elder-body text-elder-text-secondary">正在检查中...</Text>
            </View>
          </View>
        )}

        {/* 结果展示 (长辈端简化版 - 只显示结论) */}
        {results.length > 0 && !loading && (
          <View className={`rounded-bento p-6 shadow-bento border-l-8 mb-6 ${
            results[0].type === 'safe' 
              ? 'bg-elder-success-soft border-elder-success' 
              : results[0].type === 'warning' 
                ? 'bg-elder-warning-soft border-elder-warning'
                : 'bg-elder-danger-soft border-elder-danger'
          }`}>
            <View className="flex items-start justify-between">
              <View className="flex items-center mb-3">
                {results[0].type === 'safe' ? (
                  <ShieldCheck size={40} color="#43A047" className="mr-3" />
                ) : (
                  <Warning size={40} color={results[0].type === 'danger' ? '#E53935' : '#F57C00'} className="mr-3" />
                )}
                <Text className={`text-elder-subtitle font-bold ${
                  results[0].type === 'safe' 
                    ? 'text-elder-success' 
                    : results[0].type === 'warning'
                      ? 'text-elder-warning'
                      : 'text-elder-danger'
                }`}>
                  {results[0].title}
                </Text>
              </View>
              <View 
                className="w-10 h-10 bg-white/50 rounded-full flex items-center justify-center"
                onClick={clearResults}
              >
                <Close size={20} color="#6B6B6B" />
              </View>
            </View>
            <Text className="text-elder-body text-elder-text-primary leading-relaxed">
              {results[0].message}
            </Text>
            
            {/* 如果有风险，显示简单建议 */}
            {results[0].type !== 'safe' && (
              <View className="mt-4 pt-4 border-t border-white/50">
                <Text className="text-elder-body text-elder-text-primary font-bold">
                  💡 建议联系家属或医生确认
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 已检查的药品名 */}
        {drugInput && results.length > 0 && (
          <View className="bg-white rounded-bento-sm p-4 shadow-card mb-6">
            <Text className="text-elder-caption text-elder-text-muted mb-2 block">刚才查的是：</Text>
            <Text className="text-elder-body text-elder-text-primary font-bold">{drugInput}</Text>
          </View>
        )}

        {/* 语音输入入口 (长辈友好) */}
        <View className="mt-4">
          <Text className="text-center text-elder-text-muted text-elder-caption mb-3 block">
            也可以直接说药名
          </Text>
          <View 
            className="bg-elder-primary rounded-bento-sm p-5 flex items-center justify-center active:scale-[0.97] transition-transform shadow-bento"
            onClick={() => Taro.navigateTo({ url: '/subpackages/voice_ai/pages/index/index' })}
          >
            <Microphone size={32} color="#FFFFFF" />
            <Text className="text-elder-body text-white font-bold ml-3">按住说话</Text>
          </View>
        </View>

        {/* 温馨提示 */}
        <View className="mt-8 text-center">
          <Text className="text-elder-caption text-elder-text-muted">
            📞 如有疑问，请联系家属或拨打医院电话
          </Text>
        </View>
      </ScrollView>
    </PageShell>
  )

  // --- FAMILY VIEW (完整版) ---
  const renderFamilyView = () => (
    <PageShell roleTone="family" className="bg-family-canvas min-h-screen">
      <View className="bg-white p-4 pt-12 shadow-dash sticky top-0 z-10">
        <Text className="text-dash-title font-bold text-dash-text-main block">药物相互作用检查</Text>
        <Text className="text-dash-tiny text-dash-text-sub">查询新药是否与当前用药方案冲突</Text>
      </View>

      <ScrollView className="p-4" scrollY>
        {/* 快速检查 */}
        <View className="bg-white p-5 rounded-dash shadow-dash mb-4">
          <Text className="font-bold text-dash-text-main mb-3 block">快速检查</Text>
          <View className="flex gap-2 mb-4">
            <Input 
              className="flex-1 bg-family-canvas h-10 px-3 rounded-lg text-sm" 
              placeholder="输入药品名称..." 
              value={drugInput} 
              onInput={e => setDrugInput(e.detail.value)} 
            />
            <Button 
              className="bg-family-primary text-white h-10 px-4 rounded-lg flex items-center text-sm m-0 border-none" 
              onClick={handleCheck}
              loading={loading}
            >
              检查
            </Button>
          </View>
          
          {/* 快捷操作 */}
          <View className="flex gap-2">
            <Tag type="primary" onClick={handleScan} className="cursor-pointer">
              <Scan size={14} className="mr-1" /> 扫码
            </Tag>
            <Tag type="success" onClick={handleTakePhoto} className="cursor-pointer">
              <Photograph size={14} className="mr-1" /> 拍照
            </Tag>
          </View>
        </View>

        {/* 检查结果 */}
        {results.length > 0 && (
          <View className={`p-4 rounded-dash shadow-dash mb-4 border-l-4 ${
            results[0].type === 'safe' 
              ? 'bg-family-success-soft border-family-success' 
              : results[0].type === 'warning' 
                ? 'bg-family-warning-soft border-family-warning'
                : 'bg-family-danger-soft border-family-danger'
          }`}>
            <View className="flex items-center justify-between mb-2">
              <View className="flex items-center">
                {results[0].type === 'safe' ? (
                  <ShieldCheck size={20} color="#22C55E" className="mr-2" />
                ) : (
                  <Warning size={20} color={results[0].type === 'danger' ? '#EF4444' : '#F59E0B'} className="mr-2" />
                )}
                <Text className="font-bold text-dash-text-main">{results[0].title}</Text>
              </View>
              <View onClick={clearResults} className="cursor-pointer">
                <Close size={16} color="#94A3B8" />
              </View>
            </View>
            <Text className="text-sm text-dash-text-sub">{results[0].message}</Text>
            
            {results[0].details && results[0].details.length > 0 && (
              <View className="mt-3 pt-3 border-t border-dash-border">
                <Text className="text-xs font-bold text-dash-text-sub mb-2 block">建议措施：</Text>
                {results[0].details.map((detail, idx) => (
                  <Text key={idx} className="text-xs text-dash-text-sub block mb-1">• {detail}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 历史查询 */}
        <SectionBlock title="历史查询" description="近期查询记录">
          {historyLoading ? (
            <Skeleton rows={3} animated />
          ) : history.length === 0 ? (
            <Empty description="暂无查询记录" />
          ) : (
            <View className="space-y-3">
              {history.map((record, idx) => (
                <View key={idx} className="bg-white p-4 rounded-dash shadow-dash">
                  <View className="flex justify-between items-center mb-2">
                    <Text className="font-bold text-dash-text-main">{record.drugName}</Text>
                    <Tag type={record.hasInteraction ? 'warning' : 'success'} size="small">
                      {record.hasInteraction ? '有风险' : '安全'}
                    </Tag>
                  </View>
                  <Text className="text-xs text-dash-text-sub">
                    {new Date(record.checkedAt).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </SectionBlock>
      </ScrollView>
    </PageShell>
  )

  return isElder ? renderElderView() : renderFamilyView()
}
