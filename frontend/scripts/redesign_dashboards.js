const fs = require('fs');

// 1. Elder Dashboard (index.tsx)
const elderTsx = `import { View, Text, Image } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import React, { useCallback, useMemo, useState } from 'react'
import { getTodayHealthOverview, getTodayMedications } from '@/services'
import type { TodayHealthOverview, TodayMedication } from '@/services/types'
import { Icon, UserIcon } from '@/components/icons'
import { PageShell } from '@/components/shell'
import { homeQuickActionsByRole } from '@/design/navigation'
import { buildHealthSummaryCards, getGreetingText, maskDisplayName } from '@/view-models/dashboard'
import { useRole } from '@/hooks/useRole'
import FamilyDashboard from './FamilyDashboard'
import './elder.scss'

export default function IndexPage() {
  const { isFamily } = useRole()
  const [health, setHealth] = useState<TodayHealthOverview>({ alerts: [], recordsCount: 0 })
  const [todayMeds, setTodayMeds] = useState<TodayMedication[]>([])
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<{ phone?: string; nickname?: string } | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const info = Taro.getStorageSync('userInfo')
      if (info) setUserInfo(JSON.parse(info))
    } catch (_) { setUserInfo(null) }

    try {
      const [medsRes, healthRes] = await Promise.allSettled([
        getTodayMedications(),
        getTodayHealthOverview(),
      ])
      if (medsRes.status === 'fulfilled') setTodayMeds(medsRes.value || [])
      setHealth(healthRes.status === 'fulfilled' ? healthRes.value : { alerts: [], recordsCount: 0 })
    } finally {
      setLoading(false)
    }
  }, [])

  useLoad(() => { loadData() })

  if (isFamily) return <FamilyDashboard />

  const summaryCards = useMemo(() => buildHealthSummaryCards({
    bloodPressure: health.bloodPressure,
    heartRate: health.heartRate?.value,
    todayMeds,
  }), [health, todayMeds])

  const quickActions = homeQuickActionsByRole['elder']

  const navigateByPath = (path: string) => {
    if (path) Taro.navigateTo({ url: path })
  }

  const handleSos = () => { Taro.navigateTo({ url: '/subpackages/sos/pages/index/index' }) }
  const handleVoice = () => { Taro.navigateTo({ url: '/subpackages/voice_ai/pages/index/index' }) }
  const handleCallFamily = () => { Taro.makePhoneCall({ phoneNumber: '13800138000' }) }

  return (
    <PageShell roleTone="elder" className="elder-dashboard" loading={loading}>
      <View className="elder-header">
        <View className="greeting-box">
          <Text className="greeting-title">{getGreetingText()}，{maskDisplayName(userInfo) || '长辈'}</Text>
          <Text className="greeting-sub">今天天气不错，记得多喝水哦</Text>
        </View>
        <UserIcon size={48} color="#2D5AEE" />
      </View>

      <View className="elder-main-actions">
        <View className="main-btn voice-btn" onClick={handleVoice}>
          <Icon name="mic" size={42} color="#fff" />
          <Text className="btn-text">语音帮手</Text>
        </View>
        <View className="main-btn sos-btn" onClick={handleSos}>
          <Icon name="sos" size={42} color="#fff" />
          <Text className="btn-text">紧急求救</Text>
        </View>
      </View>

      <View className="elder-section">
        <Text className="section-title">我的健康</Text>
        <View className="health-cards">
          {summaryCards.map((card, idx) => (
            <View key={card.key} className={\`health-card tone-\${card.tone}\`}>
              <Text className="card-title">{card.title}</Text>
              <View className="card-val-row">
                <Text className="card-val">{card.value}</Text>
                <Text className="card-unit">{card.unit}</Text>
              </View>
              <Text className="card-hint">{card.hint}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="elder-section">
        <Text className="section-title">常用功能</Text>
        <View className="function-grid">
          {quickActions.map(item => (
            <View key={item.key} className="func-item" onClick={() => navigateByPath(item.path)}>
              <View className="func-icon">
                <Icon name={item.icon} size={36} color="#2D5AEE" />
              </View>
              <Text className="func-label">{item.label}</Text>
            </View>
          ))}
          <View className="func-item" onClick={handleCallFamily}>
            <View className="func-icon family-call">
              <Icon name="phone" size={36} color="#C97B55" />
            </View>
            <Text className="func-label">呼叫家属</Text>
          </View>
        </View>
      </View>
    </PageShell>
  )
}
`

// 2. Elder SCSS
const elderScss = `
.elder-dashboard {
  background: #F4F6F9;
  min-height: 100vh;
  padding: 16px 20px 40px;
}

.elder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  background: #fff;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);

  .greeting-title {
    display: block;
    font-size: 26px;
    font-weight: bold;
    color: #333;
  }
  .greeting-sub {
    display: block;
    font-size: 16px;
    color: #666;
    margin-top: 6px;
  }
}

.elder-main-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;

  .main-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 0;
    border-radius: 20px;
    box-shadow: 0 6px 16px rgba(0,0,0,0.1);
    
    .btn-text {
      margin-top: 12px;
      font-size: 22px;
      font-weight: bold;
      color: #fff;
    }
  }

  .voice-btn {
    background: linear-gradient(135deg, #4A79FF, #2D5AEE);
  }
  .sos-btn {
    background: linear-gradient(135deg, #FF6B6B, #E53935);
  }
}

.elder-section {
  margin-bottom: 32px;

  .section-title {
    display: block;
    font-size: 22px;
    font-weight: bold;
    color: #333;
    margin-bottom: 16px;
    padding-left: 8px;
    border-left: 6px solid #2D5AEE;
  }
}

.health-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .health-card {
    background: #fff;
    padding: 16px 20px;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    
    &.tone-warning { border-left: 4px solid #FFB020; }
    &.tone-danger { border-left: 4px solid #FF6B6B; }
    &.tone-success { border-left: 4px solid #4CAF50; }
    &.tone-normal { border-left: 4px solid #2D5AEE; }

    .card-title {
      font-size: 18px;
      color: #666;
    }
    .card-val-row {
      margin-top: 8px;
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .card-val {
      font-size: 32px;
      font-weight: bold;
      color: #333;
    }
    .card-unit {
      font-size: 16px;
      color: #999;
    }
    .card-hint {
      margin-top: 8px;
      font-size: 15px;
      color: #777;
    }
  }
}

.function-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  background: #fff;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);

  .func-item {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .func-icon {
    width: 64px;
    height: 64px;
    background: #F0F4FF;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;

    &.family-call {
      background: #FFF3EB;
    }
  }
  .func-label {
    font-size: 16px;
    color: #333;
  }
}
`

// 3. Family Dashboard
const familyTsx = `import { useCallback, useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'
import { getElderlyOverview } from '@/services/modules/family'
import type { ElderlyOverview } from '@/services/types'
import { Icon, UserIcon } from '@/components/icons'
import { PageShell } from '@/components/shell'
import { homeQuickActionsByRole } from '@/design/navigation'
import { buildFamilySummaryCards } from '@/view-models/dashboard'
import './family.scss'

export default function FamilyDashboard() {
  const [overview, setOverview] = useState<ElderlyOverview | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const data = await getElderlyOverview()
      setOverview(data)
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [])

  useLoad(() => { loadData() })
  useDidShow(() => { if (overview) loadData(true) })

  const summaryCards = useMemo(() => buildFamilySummaryCards(overview), [overview])
  const quickActions = homeQuickActionsByRole.family

  return (
    <PageShell roleTone="family" className="family-dashboard" loading={loading}>
      <View className="family-header">
        <View className="family-greeting">
          <Text className="greeting-title">关注长辈最新状态</Text>
          <Text className="greeting-sub">随时掌握家人的健康与安全</Text>
        </View>
        <View className="avatar-btn" onClick={() => Taro.navigateTo({ url: '/pages/profile/index' })}>
          <UserIcon size={32} color="#fff" />
        </View>
      </View>

      <View className="status-overview">
        <View className="status-item">
          <Text className="val">{overview?.todayHealth.medicationProgress || 0}%</Text>
          <Text className="label">用药进度</Text>
        </View>
        <View className="status-divider" />
        <View className="status-item">
          <Text className="val">85分</Text>
          <Text className="label">健康评分</Text>
        </View>
        <View className="status-divider" />
        <View className="status-item">
          <Text className="val" style={{color: '#C97B55'}}>正常</Text>
          <Text className="label">活跃状态</Text>
        </View>
      </View>

      <View className="family-section">
        <Text className="section-title">实时位置</Text>
        <View className="location-card" onClick={() => Taro.navigateTo({ url: '/subpackages/location/pages/index/index' })}>
          <View className="location-info">
            <Icon name="location" size={24} color="#C97B55" />
            <Text className="address">{overview?.location?.address || '获取位置中...'}</Text>
          </View>
          <View className="location-meta">
            <Text className="meta-text">{overview?.location?.updatedAt || ''} 更新</Text>
            <View className="location-action">地图查看</View>
          </View>
        </View>
      </View>

      <View className="family-section">
        <Text className="section-title">今日体征指标</Text>
        <View className="stats-grid">
          {summaryCards.map(({ key, title, value, unit, hint }) => (
            <View key={key} className="stat-card">
              <Text className="stat-title">{title}</Text>
              <View className="stat-value">
                <Text className="val">{value}</Text>
                <Text className="unit">{unit}</Text>
              </View>
              <Text className="stat-hint">{hint}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="family-section">
        <Text className="section-title">常用管理功能</Text>
        <View className="action-grid">
          {quickActions.map(item => (
            <View key={item.key} className="action-item" onClick={() => Taro.navigateTo({ url: item.path })}>
              <View className="action-icon">
                <Icon name={item.icon} size={28} color="#C97B55" />
              </View>
              <Text className="action-label">{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </PageShell>
  )
}
`

// 4. Family SCSS
const familyScss = `
.family-dashboard {
  background: #FFF8F2;
  min-height: 100vh;
  padding: 16px 20px 40px;
}

.family-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  .greeting-title {
    display: block;
    font-size: 24px;
    font-weight: bold;
    color: #333;
  }
  .greeting-sub {
    display: block;
    font-size: 15px;
    color: #666;
    margin-top: 4px;
  }
  
  .avatar-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #C97B55;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.status-overview {
  display: flex;
  background: #fff;
  border-radius: 16px;
  padding: 20px 0;
  box-shadow: 0 4px 12px rgba(201,123,85, 0.08);
  margin-bottom: 24px;

  .status-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;

    .val {
      font-size: 22px;
      font-weight: bold;
      color: #333;
    }
    .label {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }
  }

  .status-divider {
    width: 1px;
    background: #EEE;
    margin: 8px 0;
  }
}

.family-section {
  margin-bottom: 24px;

  .section-title {
    display: block;
    font-size: 18px;
    font-weight: bold;
    color: #333;
    margin-bottom: 12px;
  }
}

.location-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);

  .location-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;

    .address {
      font-size: 16px;
      color: #333;
      font-weight: bold;
    }
  }

  .location-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .meta-text {
      font-size: 13px;
      color: #999;
    }

    .location-action {
      background: #FFF3EB;
      color: #C97B55;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: bold;
    }
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  .stat-card {
    background: #fff;
    padding: 16px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.03);

    .stat-title {
      font-size: 14px;
      color: #666;
    }
    
    .stat-value {
      margin-top: 8px;
      display: flex;
      align-items: baseline;
      gap: 4px;

      .val {
        font-size: 24px;
        font-weight: bold;
        color: #333;
      }
      .unit {
        font-size: 12px;
        color: #999;
      }
    }
    
    .stat-hint {
      display: block;
      margin-top: 6px;
      font-size: 12px;
      color: #999;
    }
  }
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: #fff;
  border-radius: 12px;
  padding: 16px 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);

  .action-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;

    .action-icon {
      width: 48px;
      height: 48px;
      background: #FFF3EB;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .action-label {
      font-size: 13px;
      color: #333;
    }
  }
}
`

// 删除旧的 .scss 
try { fs.unlinkSync('src/pages/index/index.scss'); } catch(e){}
try { fs.unlinkSync('src/pages/index/FamilyDashboard.scss'); } catch(e){}

// 写入新的
fs.writeFileSync('src/pages/index/index.tsx', elderTsx, 'utf8');
fs.writeFileSync('src/pages/index/elder.scss', elderScss, 'utf8');
fs.writeFileSync('src/pages/index/FamilyDashboard.tsx', familyTsx, 'utf8');
fs.writeFileSync('src/pages/index/family.scss', familyScss, 'utf8');

console.log('UI files successfully rewritten.');
