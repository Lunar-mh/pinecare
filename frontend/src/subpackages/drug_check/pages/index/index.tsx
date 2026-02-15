import { useState, useEffect, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import { Warning, Checked, Plus, ArrowRight, Close } from '@nutui/icons-react-taro';
import {
  checkDrugInteraction,
  getInteractionHistory,
  acknowledgeRisk,
  checkContraindication,
  checkFoodInteraction,
} from '@/services/modules/drug_interaction';
import type {
  DrugInteractionResult,
  DrugInteractionRecord,
  DrugInteractionLevel,
  DrugContraindication,
  DrugFoodInteraction,
} from '@/services/types';
import './index.scss';

type TabKey = 'check' | 'history' | 'contraindication';

const LEVEL_CONFIG: Record<DrugInteractionLevel, { label: string; color: string; bg: string }> = {
  X: { label: '禁止合用', color: '#fff', bg: '#e53935' },
  D: { label: '避免合用', color: '#fff', bg: '#fb8c00' },
  C: { label: '谨慎合用', color: '#1a1a1a', bg: '#f9a825' },
  B: { label: '较安全', color: '#fff', bg: '#43a047' },
  A: { label: '无明显影响', color: '#fff', bg: '#1e88e5' },
};

export default function DrugCheckIndex() {
  const [activeTab, setActiveTab] = useState<TabKey>('check');
  const [drugInput, setDrugInput] = useState('');
  const [drugList, setDrugList] = useState<string[]>([]);
  const [checkResults, setCheckResults] = useState<DrugInteractionResult[]>([]);
  const [history, setHistory] = useState<DrugInteractionRecord[]>([]);
  const [checking, setChecking] = useState(false);
  const [contraName, setContraName] = useState('');
  const [contraResults, setContraResults] = useState<DrugContraindication[]>([]);
  const [foodResults, setFoodResults] = useState<DrugFoodInteraction[]>([]);
  const [contraChecking, setContraChecking] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const res = await getInteractionHistory();
      if (res && Array.isArray(res)) {
        setHistory(res as DrugInteractionRecord[]);
      }
    } catch (_) { /* noop */ }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  const handleAddDrug = () => {
    const name = drugInput.trim();
    if (!name) return;
    if (drugList.includes(name)) {
      Taro.showToast({ title: '已添加该药物', icon: 'none' });
      return;
    }
    if (drugList.length >= 10) {
      Taro.showToast({ title: '最多添加10种药物', icon: 'none' });
      return;
    }
    setDrugList((prev) => [...prev, name]);
    setDrugInput('');
  };

  const handleRemoveDrug = (name: string) => {
    setDrugList((prev) => prev.filter((d) => d !== name));
  };

  const handleCheck = async () => {
    if (drugList.length < 2) {
      Taro.showToast({ title: '请至少添加2种药物', icon: 'none' });
      return;
    }
    setChecking(true);
    setCheckResults([]);
    try {
      const res = await checkDrugInteraction({ drugList });
      if (res && Array.isArray(res)) {
        setCheckResults(res as DrugInteractionResult[]);
        if ((res as DrugInteractionResult[]).length === 0) {
          Taro.showToast({ title: '未发现相互作用', icon: 'success' });
        }
      }
    } catch (_) {
      Taro.showToast({ title: '检查失败，请重试', icon: 'none' });
    } finally {
      setChecking(false);
    }
  };

  const handleAcknowledge = async (id: number) => {
    try {
      await acknowledgeRisk({ interactionId: id });
      setHistory((prev) => prev.map((r) => r.id === id ? { ...r, status: 'acknowledged' as const } : r));
      Taro.showToast({ title: '已确认知悉', icon: 'success' });
    } catch (_) {
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  };

  const handleContraCheck = async () => {
    const name = contraName.trim();
    if (!name) return;
    setContraChecking(true);
    setContraResults([]);
    setFoodResults([]);
    try {
      const [contra, food] = await Promise.all([
        checkContraindication({ drugName: name }),
        checkFoodInteraction({ drugName: name }),
      ]);
      if (contra && Array.isArray(contra)) {
        setContraResults(contra as DrugContraindication[]);
      }
      if (food && Array.isArray(food)) {
        setFoodResults(food as DrugFoodInteraction[]);
      }
    } catch (_) {
      Taro.showToast({ title: '查询失败，请重试', icon: 'none' });
    } finally {
      setContraChecking(false);
    }
  };

  const severityLabel = (s: string) => {
    if (s === 'high') return { label: '高风险', color: '#e53935' };
    if (s === 'medium') return { label: '中风险', color: '#fb8c00' };
    return { label: '低风险', color: '#43a047' };
  };

  return (
    <View className='drug-check'>
      {/* 顶部 */}
      <View className='drug-check__header'>
        <View className='drug-check__header-info'>
          <View className='drug-check__avatar'>
            <Warning size={28} color='#fff' />
          </View>
          <View>
            <Text className='drug-check__title'>用药安全检查</Text>
            <Text className='drug-check__subtitle'>智能药物相互作用检测</Text>
          </View>
        </View>
      </View>

      {/* Tab导航 */}
      <View className='drug-tabs'>
        {(['check', 'history', 'contraindication'] as TabKey[]).map((tab) => (
          <View
            key={tab}
            className={'drug-tab' + (activeTab === tab ? ' drug-tab--active' : '')}
            onClick={() => setActiveTab(tab)}
          >
            <Text className='drug-tab__text'>
              {tab === 'check' ? '联合用药' : tab === 'history' ? '历史记录' : '禁忌查询'}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView className='drug-check__content' scrollY>
        {/* 联合用药检查 */}
        {activeTab === 'check' && (
          <View className='check-panel'>
            <View className='drug-input-row'>
              <Input
                className='drug-input'
                value={drugInput}
                placeholder='输入药品名称...'
                onInput={(e) => setDrugInput(e.detail.value)}
                confirmType='done'
                onConfirm={handleAddDrug}
                maxlength={30}
              />
              <View className='drug-input-add' onClick={handleAddDrug}>
                <Plus size={20} color='#fff' />
              </View>
            </View>

            {drugList.length > 0 && (
              <View className='drug-tags'>
                {drugList.map((d) => (
                  <View key={d} className='drug-tag'>
                    <Text className='drug-tag__name'>{d}</Text>
                    <View className='drug-tag__remove' onClick={() => handleRemoveDrug(d)}>
                      <Close size={14} color='#6a1b9a' />
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View
              className={'check-btn' + (checking ? ' check-btn--loading' : '')}
              onClick={handleCheck}
            >
              {checking ? (
                <Text className='check-btn__text'>检查中...</Text>
              ) : (
                <>
                  <Checked size={20} color='#fff' />
                  <Text className='check-btn__text'>开始检查</Text>
                </>
              )}
            </View>

            {checkResults.length > 0 && (
              <View className='results-section'>
                <Text className='results-section__title'>检查结果（{checkResults.length}项）</Text>
                {checkResults.map((r, i) => {
                  const cfg = LEVEL_CONFIG[r.level];
                  return (
                    <View key={i} className='result-card' style={{ borderLeftColor: cfg.bg }}>
                      <View className='result-card__header'>
                        <Text className='result-card__drugs'>{r.drugA} + {r.drugB}</Text>
                        <View className='result-level' style={{ background: cfg.bg }}>
                          <Text className='result-level__text' style={{ color: cfg.color }}>
                            {r.level} · {cfg.label}
                          </Text>
                        </View>
                      </View>
                      {r.description && (
                        <Text className='result-card__desc'>{r.description}</Text>
                      )}
                      {r.mechanism && (
                        <Text className='result-card__mechanism'>机制：{r.mechanism}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {checkResults.length === 0 && drugList.length >= 2 && !checking && (
              <View className='empty-hint'>
                <Text className='empty-hint__text'>点击「开始检查」检测药物相互作用</Text>
              </View>
            )}

            {drugList.length < 2 && (
              <View className='empty-hint'>
                <Text className='empty-hint__text'>请添加至少2种药物进行检查</Text>
              </View>
            )}
          </View>
        )}

        {/* 历史记录 */}
        {activeTab === 'history' && (
          <View className='history-panel'>
            {history.length === 0 ? (
              <View className='empty-hint'>
                <Text className='empty-hint__text'>暂无历史检测记录</Text>
              </View>
            ) : (
              history.map((rec) => {
                const cfg = LEVEL_CONFIG[rec.level];
                return (
                  <View key={rec.id} className='history-card'>
                    <View className='history-card__header'>
                      <Text className='history-card__drugs'>{rec.drugA} + {rec.drugB}</Text>
                      <View className='result-level' style={{ background: cfg.bg }}>
                        <Text className='result-level__text' style={{ color: cfg.color }}>
                          {rec.level} · {cfg.label}
                        </Text>
                      </View>
                    </View>
                    {rec.riskDescription && (
                      <Text className='history-card__desc'>{rec.riskDescription}</Text>
                    )}
                    {rec.suggestion && (
                      <Text className='history-card__suggestion'>建议：{rec.suggestion}</Text>
                    )}
                    <View className='history-card__footer'>
                      <Text className='history-card__time'>{rec.detectedAt.slice(0, 10)}</Text>
                      {rec.status === 'new' && (
                        <View className='acknowledge-btn' onClick={() => handleAcknowledge(rec.id)}>
                          <Checked size={16} color='#fff' />
                          <Text className='acknowledge-btn__text'>确认知悉</Text>
                        </View>
                      )}
                      {rec.status === 'acknowledged' && (
                        <Text className='history-card__ack'>已确认</Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* 禁忌查询 */}
        {activeTab === 'contraindication' && (
          <View className='contra-panel'>
            <View className='drug-input-row'>
              <Input
                className='drug-input'
                value={contraName}
                placeholder='输入药品名称查询禁忌...'
                onInput={(e) => setContraName(e.detail.value)}
                confirmType='search'
                onConfirm={handleContraCheck}
                maxlength={30}
              />
              <View className='drug-input-add' onClick={handleContraCheck}>
                <ArrowRight size={20} color='#fff' />
              </View>
            </View>

            {contraChecking && (
              <View className='empty-hint'>
                <Text className='empty-hint__text'>查询中...</Text>
              </View>
            )}

            {contraResults.length > 0 && (
              <View className='results-section'>
                <Text className='results-section__title'>疾病禁忌（{contraResults.length}项）</Text>
                {contraResults.map((c, i) => {
                  const sv = severityLabel(c.severity);
                  return (
                    <View key={i} className='contra-card' style={{ borderLeftColor: sv.color }}>
                      <View className='contra-card__header'>
                        <Text className='contra-card__disease'>{c.diseaseName}</Text>
                        <Text className='contra-card__severity' style={{ color: sv.color }}>{sv.label}</Text>
                      </View>
                      {c.description && (
                        <Text className='contra-card__desc'>{c.description}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {foodResults.length > 0 && (
              <View className='results-section'>
                <Text className='results-section__title'>食物相互作用（{foodResults.length}项）</Text>
                {foodResults.map((f, i) => (
                  <View key={i} className='food-card'>
                    <View className='food-card__header'>
                      <Text className='food-card__name'>{f.foodName}</Text>
                      <Text className='food-card__type'>{f.interactionType}</Text>
                    </View>
                    {f.description && (
                      <Text className='food-card__desc'>{f.description}</Text>
                    )}
                    {f.suggestion && (
                      <Text className='food-card__suggestion'>建议：{f.suggestion}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {!contraChecking && contraResults.length === 0 && foodResults.length === 0 && contraName && (
              <View className='empty-hint'>
                <Text className='empty-hint__text'>输入药品名称后点击查询</Text>
              </View>
            )}

            {!contraName && (
              <View className='empty-hint'>
                <Text className='empty-hint__text'>输入药品名称，查询禁忌症和食物相互作用</Text>
              </View>
            )}
          </View>
        )}
        <View style={{ height: '32px' }} />
      </ScrollView>
    </View>
  );
}
