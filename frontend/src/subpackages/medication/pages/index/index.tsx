import { useState, useEffect, useCallback } from 'react';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import { View, Text, ScrollView, Switch } from '@tarojs/components';
import { Add, Checked, Check, Clock, List, Warning } from '@nutui/icons-react-taro';
import { LargeButton, SectionTitle, AlertBanner } from '@/components/elderly';
import {
  getTodayMedications,
  markMedicationTaken,
  skipMedication,
  getMedications,
  updateMedication,
  deleteMedication,
} from '@/services/modules/medication';
import type { TodayMedication, Medication } from '@/services/types';
import './index.scss';

export default function MedicationIndex() {
  const [todayMeds, setTodayMeds] = useState<TodayMedication[]>([]);
  const [plans, setPlans] = useState<Medication[]>([]);
  const [loadingToday, setLoadingToday] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'plan'>('today');

  // ===== 今日用药 =====
  const loadTodayMeds = useCallback(async () => {
    setLoadingToday(true);
    try {
      const data = await getTodayMedications();
      setTodayMeds(data || []);
    } catch (_) {
      // silent
    } finally {
      setLoadingToday(false);
    }
  }, []);

  // ===== 用药计划 =====
  const loadPlans = useCallback(async () => {
    setLoadingPlan(true);
    try {
      const data = await getMedications();
      setPlans(data || []);
    } catch (_) {
      // silent
    } finally {
      setLoadingPlan(false);
    }
  }, []);

  useEffect(() => {
    loadTodayMeds();
    loadPlans();
  }, [loadTodayMeds, loadPlans]);

  usePullDownRefresh(() => {
    Promise.all([loadTodayMeds(), loadPlans()]).then(() => {
      Taro.stopPullDownRefresh();
    });
  });

  const handleTake = async (medicationId: string, time: string) => {
    try {
      await markMedicationTaken(medicationId, time);
      Taro.showToast({ title: '已标记服用', icon: 'success' });
      loadTodayMeds();
    } catch (_) { /* noop */ }
  };

  const handleSkip = async (medicationId: string, time: string) => {
    try {
      await skipMedication(medicationId, time, '用户主动跳过');
      Taro.showToast({ title: '已跳过', icon: 'success' });
      loadTodayMeds();
    } catch (_) { /* noop */ }
  };

  const handleTogglePlan = async (id: string, currentActive: boolean) => {
    try {
      await updateMedication(id, { isActive: !currentActive });
      setPlans(prev => prev.map(p => p.id === id ? { ...p, isActive: !currentActive } : p));
    } catch (_) {
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  };

  const handleDeletePlan = async (id: string, name: string) => {
    Taro.showModal({
      title: '确认删除',
      content: `确定删除"${name}"用药计划？`,
      confirmText: '删除',
      cancelText: '取消',
      confirmColor: '#e53935',
      success: async (res) => {
        if (res.confirm) {
          try {
            await deleteMedication(id);
            setPlans(prev => prev.filter(p => p.id !== id));
            Taro.showToast({ title: '已删除', icon: 'success' });
          } catch (_) {
            Taro.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  };

  const handleAddPlan = () => {
    Taro.navigateTo({ url: '/subpackages/medication/pages/add/index' });
  };

  // 分组
  const pendingMeds = todayMeds.filter(m => m.status === 'pending');
  const takenMeds = todayMeds.filter(m => m.status === 'taken');
  const missedMeds = todayMeds.filter(m => m.status === 'missed');
  const progress = todayMeds.length > 0
    ? Math.round((takenMeds.length / todayMeds.length) * 100)
    : 0;

  const activePlans = plans.filter(p => p.isActive);
  const inactivePlans = plans.filter(p => !p.isActive);

  return (
    <View className="medication-index">
      <ScrollView className="medication-index__scroll" scrollY>
        {/* 进度概览 */}
        <View className="progress-card">
          <View className="progress-info">
            <Text className="progress-title">今日用药进度</Text>
            <Text className="progress-value">{progress}%</Text>
          </View>
          <View className="progress-bar">
            <View
              className="progress-bar__fill"
              style={{ width: `${progress}%` }}
            />
          </View>
          <Text className="progress-detail">
            已完成 {takenMeds.length}/{todayMeds.length} 次用药
          </Text>
        </View>

        {/* 错过提醒 */}
        {missedMeds.length > 0 && (
          <AlertBanner
            type="warning"
            title={`有 ${missedMeds.length} 次用药已错过`}
            message="请及时补服或咨询医生"
          />
        )}

        {/* Tab切换 */}
        <View className="tab-bar">
          <View
            className={`tab-item ${activeTab === 'today' ? 'tab-item--active' : ''}`}
            onClick={() => setActiveTab('today')}
          >
            <Text className="tab-item__text">今日用药</Text>
          </View>
          <View
            className={`tab-item ${activeTab === 'plan' ? 'tab-item--active' : ''}`}
            onClick={() => setActiveTab('plan')}
          >
            <Text className="tab-item__text">用药计划</Text>
          </View>
        </View>

        {activeTab === 'today' ? (
          <>
            {pendingMeds.length > 0 && (
              <>
                <SectionTitle title="待服用" />
                <View className="medication-list">
                  {pendingMeds.map((med, i) => (
                    <View key={`${med.medicationId}-${i}`} className="medication-item medication-item--pending">
                      <View className="medication-item__time">
                        <Clock size={16} color="#fb8c00" />
                        <Text className="time-value">{med.time}</Text>
                      </View>
                      <View className="medication-item__content">
                        <Text className="medication-name">{med.name}</Text>
                        <Text className="medication-dosage">{med.dosage}</Text>
                      </View>
                      <View className="medication-item__actions">
                        <View
                          className="action-btn action-btn--take"
                          onClick={() => handleTake(med.medicationId, med.time)}
                        >
                          <Checked size={18} color="#fff" />
                          <Text>已服</Text>
                        </View>
                        <View
                          className="action-btn action-btn--skip"
                          onClick={() => handleSkip(med.medicationId, med.time)}
                        >
                          <Text>跳过</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {takenMeds.length > 0 && (
              <>
                <SectionTitle title="已服用" />
                <View className="medication-list">
                  {takenMeds.map((med, i) => (
                    <View key={`${med.medicationId}-${i}`} className="medication-item medication-item--taken">
                      <View className="medication-item__time">
                        <Text className="time-value">{med.time}</Text>
                      </View>
                      <View className="medication-item__content">
                        <Text className="medication-name">{med.name}</Text>
                        <Text className="medication-dosage">{med.dosage}</Text>
                        {med.takenAt && (
                          <Text className="medication-time">
                            {new Date(med.takenAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 服用
                          </Text>
                        )}
                      </View>
                        <Check size={28} color="#43a047" />
                    </View>
                  ))}
                </View>
              </>
            )}

            {missedMeds.length > 0 && (
              <>
                <SectionTitle title="已错过" />
                <View className="medication-list">
                  {missedMeds.map((med, i) => (
                    <View key={`${med.medicationId}-${i}`} className="medication-item medication-item--missed">
                      <View className="medication-item__time">
                        <Warning size={16} color="#e53935" />
                        <Text className="time-value">{med.time}</Text>
                      </View>
                      <View className="medication-item__content">
                        <Text className="medication-name">{med.name}</Text>
                        <Text className="medication-dosage">{med.dosage}</Text>
                      </View>
                      <View
                        className="action-btn action-btn--take"
                        onClick={() => handleTake(med.medicationId, med.time)}
                      >
                        <Text>补服</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {todayMeds.length === 0 && !loadingToday && (
              <View className="empty-state">
                <Clock size={64} color="#ccc" />
                <Text className="empty-text">今日暂无用药计划</Text>
                <Text className="empty-hint">请先添加用药计划</Text>
              </View>
            )}
          </>
        ) : (
          <>
            {activePlans.length > 0 && (
              <>
                <SectionTitle title="进行中" />
                <View className="plan-list">
                  {activePlans.map(plan => (
                    <View key={plan.id} className="plan-item">
                      <View className="plan-item__left">
                        <View className="plan-item__icon-wrap">
                          <List size={20} color="#01579b" />
                        </View>
                        <View className="plan-item__info">
                          <Text className="plan-item__name">{plan.name}</Text>
                          <Text className="plan-item__dosage">{plan.dosage} · {plan.frequency}</Text>
                          <Text className="plan-item__schedule">
                            {plan.schedule.map(s => s.time).join('、')}
                          </Text>
                          {plan.instructions && (
                            <Text className="plan-item__instructions">{plan.instructions}</Text>
                          )}
                        </View>
                      </View>
                      <View className="plan-item__right">
                        <Switch
                          checked={plan.isActive}
                          onChange={() => handleTogglePlan(plan.id, plan.isActive)}
                          color="#01579b"
                        />
                        <View
                          className="plan-item__delete"
                          onClick={() => handleDeletePlan(plan.id, plan.name)}
                        >
                          <Text className="plan-item__delete-text">删除</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {inactivePlans.length > 0 && (
              <>
                <SectionTitle title="已停用" />
                <View className="plan-list">
                  {inactivePlans.map(plan => (
                    <View key={plan.id} className="plan-item plan-item--inactive">
                      <View className="plan-item__left">
                        <View className="plan-item__icon-wrap plan-item__icon-wrap--inactive">
                          <List size={20} color="#999" />
                        </View>
                        <View className="plan-item__info">
                          <Text className="plan-item__name plan-item__name--inactive">{plan.name}</Text>
                          <Text className="plan-item__dosage">{plan.dosage} · {plan.frequency}</Text>
                        </View>
                      </View>
                      <View className="plan-item__right">
                        <Switch
                          checked={plan.isActive}
                          onChange={() => handleTogglePlan(plan.id, plan.isActive)}
                          color="#01579b"
                        />
                        <View
                          className="plan-item__delete"
                          onClick={() => handleDeletePlan(plan.id, plan.name)}
                        >
                          <Text className="plan-item__delete-text">删除</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {plans.length === 0 && !loadingPlan && (
              <View className="empty-state">
                <List size={64} color="#ccc" />
                <Text className="empty-text">暂无用药计划</Text>
                <Text className="empty-hint">点击下方按钮添加</Text>
              </View>
            )}
          </>
        )}

        <View className="safe-area-bottom" />
      </ScrollView>

      {/* 浮动添加按钮 */}
      <View className="medication-index__fab">
        <LargeButton
          type="primary"
          size="medium"
          icon={<Add size={24} color="#fff" />}
          onClick={handleAddPlan}
        >
          添加用药计划
        </LargeButton>
      </View>
    </View>
  );
}
