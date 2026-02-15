import { useState, useEffect, useCallback } from 'react';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { Order, Plus, ArrowRight, Clock, User, Checked } from '@nutui/icons-react-taro';
import { SectionTitle } from '@/components/elderly';
import {
  getTimeBankAccount,
  getServiceRequests,
  acceptServiceRequest,
  getTimeBankTransactions,
} from '@/services/modules/timebank';
import type { TimeBankAccount, ServiceRequest } from '@/services/types';
import './index.scss';

type TabType = 'hall' | 'records';

const SERVICE_CATEGORIES = [
  { label: '全部', value: undefined },
  { label: '生活帮助', value: 'life' },
  { label: '医疗陪护', value: 'medical' },
  { label: '精神陪伴', value: 'companion' },
  { label: '技能交流', value: 'skill' },
];

interface Transaction {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  description: string;
  counterpart?: string;
  createdAt: string;
}

export default function TimeBankIndex() {
  const [account, setAccount] = useState<TimeBankAccount | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('hall');
  const [services, setServices] = useState<ServiceRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);

  const loadAccount = useCallback(async () => {
    setLoadingAccount(true);
    try {
      const data = await getTimeBankAccount();
      setAccount(data);
    } catch (_) { /* noop */ } finally {
      setLoadingAccount(false);
    }
  }, []);

  const loadServices = useCallback(async (category?: string) => {
    setLoadingServices(true);
    try {
      const res = await getServiceRequests({ status: 'open', category, page: 1, pageSize: 20 });
      setServices(res?.list || []);
    } catch (_) { /* noop */ } finally {
      setLoadingServices(false);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setLoadingTxns(true);
    try {
      const res = await getTimeBankTransactions({ page: 1, pageSize: 30 });
      setTransactions((res?.list || []) as Transaction[]);
    } catch (_) { /* noop */ } finally {
      setLoadingTxns(false);
    }
  }, []);

  useEffect(() => {
    loadAccount();
    loadServices();
  }, [loadAccount, loadServices]);

  useEffect(() => {
    if (activeTab === 'records') {
      loadTransactions();
    }
  }, [activeTab, loadTransactions]);

  usePullDownRefresh(() => {
    Promise.all([loadAccount(), loadServices(activeCategory)]).then(() => {
      Taro.stopPullDownRefresh();
    });
  });

  const handleCategoryChange = (cat: string | undefined) => {
    setActiveCategory(cat);
    loadServices(cat);
  };

  const handleAccept = async (id: string) => {
    Taro.showModal({
      title: '确认接单',
      content: '接受此服务请求后，请务必按时完成并记录服务时长。',
      confirmText: '接受',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          try {
            await acceptServiceRequest(id);
            Taro.showToast({ title: '已接受服务', icon: 'success' });
            loadServices(activeCategory);
          } catch (_) {
            Taro.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  };

  const formatBalance = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}分钟`;
    if (m === 0) return `${h}小时`;
    return `${h}小时${m}分`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const getLevelColor = (level: number) => {
    if (level >= 5) return '#c0392b';
    if (level >= 3) return '#e67e22';
    return '#2980b9';
  };

  return (
    <View className="timebank">
      <ScrollView className="timebank__scroll" scrollY>
        {/* 账户余额卡片 */}
        <View className="balance-card" style={{ background: `linear-gradient(135deg, ${account ? getLevelColor(account.level) : '#01579b'} 0%, #014a80 100%)` }}>
          <View className="balance-card__top">
            <View className="balance-card__badge">
              <Order size={16} color="#fff" />
              <Text className="balance-card__badge-text">
                {account ? `${account.title} · Lv.${account.level}` : '加载中...'}
              </Text>
            </View>
            <View className="balance-card__total">
              <Text className="balance-card__total-label">累计贡献</Text>
              <Text className="balance-card__total-value">{formatBalance(account?.totalEarned || 0)}</Text>
            </View>
          </View>

          <View className="balance-card__main">
            <Text className="balance-card__balance">{formatBalance(account?.balance || 0)}</Text>
            <Text className="balance-card__balance-label">可用余额</Text>
          </View>

          <View className="balance-card__stats">
            <View className="balance-card__stat">
              <Text className="balance-card__stat-value">{formatBalance(account?.totalEarned || 0)}</Text>
              <Text className="balance-card__stat-label">已赚取</Text>
            </View>
            <View className="balance-card__divider" />
            <View className="balance-card__stat">
              <Text className="balance-card__stat-value">{formatBalance(account?.totalSpent || 0)}</Text>
              <Text className="balance-card__stat-label">已使用</Text>
            </View>
            <View className="balance-card__divider" />
            <View className="balance-card__stat">
              <Text className="balance-card__stat-value">{account?.balance || 0}分</Text>
              <Text className="balance-card__stat-label">可用余额（分钟）</Text>
            </View>
          </View>
        </View>

        {/* 快捷操作 */}
        <View className="quick-actions">
          <View className="quick-action-item" onClick={() => Taro.showToast({ title: '发起服务功能开发中', icon: 'none' })}>
            <View className="quick-action-item__icon quick-action-item__icon--blue">
              <Plus size={22} color="#fff" />
            </View>
            <Text className="quick-action-item__label">发起服务</Text>
          </View>
          <View className="quick-action-item" onClick={() => setActiveTab('records')}>
            <View className="quick-action-item__icon quick-action-item__icon--green">
              <Clock size={22} color="#fff" />
            </View>
            <Text className="quick-action-item__label">我的记录</Text>
          </View>
          <View className="quick-action-item" onClick={() => Taro.showToast({ title: '兑换功能开发中', icon: 'none' })}>
            <View className="quick-action-item__icon quick-action-item__icon--orange">
              <ArrowRight size={22} color="#fff" />
            </View>
            <Text className="quick-action-item__label">时间兑换</Text>
          </View>
          <View className="quick-action-item" onClick={() => Taro.showToast({ title: '排行榜功能开发中', icon: 'none' })}>
            <View className="quick-action-item__icon quick-action-item__icon--purple">
              <User size={22} color="#fff" />
            </View>
            <Text className="quick-action-item__label">贡献榜</Text>
          </View>
        </View>

        {/* Tab切换 */}
        <View className="timebank-tabs">
          <View
            className={`timebank-tab ${activeTab === 'hall' ? 'timebank-tab--active' : ''}`}
            onClick={() => setActiveTab('hall')}
          >
            <Text className="timebank-tab__text">服务大厅</Text>
          </View>
          <View
            className={`timebank-tab ${activeTab === 'records' ? 'timebank-tab--active' : ''}`}
            onClick={() => setActiveTab('records')}
          >
            <Text className="timebank-tab__text">我的记录</Text>
          </View>
        </View>

        {activeTab === 'hall' ? (
          <>
            {/* 分类过滤 */}
            <ScrollView className="category-filter" scrollX enableFlex>
              {SERVICE_CATEGORIES.map(cat => (
                <View
                  key={String(cat.value)}
                  className={`category-tag ${activeCategory === cat.value ? 'category-tag--active' : ''}`}
                  onClick={() => handleCategoryChange(cat.value)}
                >
                  <Text className="category-tag__text">{cat.label}</Text>
                </View>
              ))}
            </ScrollView>

            <SectionTitle title="服务需求" />
            {services.length === 0 && !loadingServices ? (
              <View className="empty-state">
                <Order size={56} color="#ccc" />
                <Text className="empty-state__text">暂无服务请求</Text>
                <Text className="empty-state__hint">点击"发起服务"创建需求</Text>
              </View>
            ) : (
              <View className="service-list">
                {services.map(svc => (
                  <View key={svc.id} className="service-card">
                    <View className="service-card__header">
                      <View className="service-card__type-tag">
                        <Text className="service-card__type-text">{svc.type}</Text>
                      </View>
                      <Text className="service-card__duration">
                        <Clock size={14} color="#fb8c00" />
                        {' '}{svc.duration}分钟
                      </Text>
                    </View>
                    <Text className="service-card__desc">{svc.description}</Text>
                    <View className="service-card__footer">
                      <Text className="service-card__location">📍 {svc.location}</Text>
                      <View
                        className="service-card__btn"
                        onClick={() => handleAccept(svc.id)}
                      >
                        <Checked size={16} color="#fff" />
                        <Text className="service-card__btn-text">接受服务</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            <SectionTitle title="时间流水" />
            {transactions.length === 0 && !loadingTxns ? (
              <View className="empty-state">
                <Clock size={56} color="#ccc" />
                <Text className="empty-state__text">暂无交易记录</Text>
              </View>
            ) : (
              <View className="transaction-list">
                {transactions.map(txn => (
                  <View key={txn.id} className="transaction-item">
                    <View
                      className={`transaction-item__icon ${txn.type === 'earn' ? 'transaction-item__icon--earn' : 'transaction-item__icon--spend'}`}
                    >
                      {txn.type === 'earn'
                        ? <ArrowRight size={20} color="#43a047" />
                        : <ArrowRight size={20} color="#e53935" style={{ transform: 'rotate(180deg)' }} />
                      }
                    </View>
                    <View className="transaction-item__info">
                      <Text className="transaction-item__desc">{txn.description}</Text>
                      {txn.counterpart && (
                        <Text className="transaction-item__counterpart">与 {txn.counterpart}</Text>
                      )}
                      <Text className="transaction-item__date">{formatDate(txn.createdAt)}</Text>
                    </View>
                    <Text className={`transaction-item__amount ${txn.type === 'earn' ? 'transaction-item__amount--earn' : 'transaction-item__amount--spend'}`}>
                      {txn.type === 'earn' ? '+' : '-'}{txn.amount}分钟
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <View className="safe-area-bottom" />
      </ScrollView>
    </View>
  );
}
