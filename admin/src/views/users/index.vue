<template>
  <div class="user-management">
    <header class="page-header">
      <div class="title-section">
        <h2>全域老人健康档案</h2>
        <p>共管理 12,840 位社区长辈，当前 14 位处于告警状态。</p>
      </div>
      <div class="action-section">
        <el-button type="primary" round icon="Plus">新增档案</el-button>
        <el-button round icon="Download">导出报表</el-button>
      </div>
    </header>

    <!-- 顶部统计看板 -->
    <section class="stats-overview">
      <div class="stat-card glass-panel">
        <span class="label">活跃用户</span>
        <div class="value-row">
          <span class="value">9,420</span>
          <span class="trend up">+12%</span>
        </div>
      </div>
      <div class="stat-card glass-panel">
        <span class="label">健康合格率</span>
        <div class="value-row">
          <span class="value">88.5%</span>
          <span class="trend down">-2.1%</span>
        </div>
      </div>
      <div class="stat-card glass-panel">
        <span class="label">设备在线</span>
        <div class="value-row">
          <span class="value">12,105</span>
          <span class="trend">稳定</span>
        </div>
      </div>
    </section>

    <!-- 筛选器区域 -->
    <nav class="filter-bar glass-panel">
      <div class="filter-group">
        <el-input v-model="search" placeholder="姓名、手机号、紧急联系人..." prefix-icon="Search" />
      </div>
      <div class="filter-group">
        <el-select v-model="riskLevel" placeholder="风险等级">
          <el-option label="高风险 (红色)" value="high" />
          <el-option label="中风险 (黄色)" value="medium" />
          <el-option label="正常 (蓝色)" value="normal" />
        </el-select>
        <el-select v-model="community" placeholder="所属社区">
          <el-option label="阳光花园" value="yg" />
          <el-option label="长乐里" value="cl" />
        </el-select>
      </div>
    </nav>

    <!-- Bento 卡片列表 -->
    <main class="user-grid">
      <div v-for="user in mockUsers" :key="user.id" class="user-bento-card glass-panel" :class="user.risk">
        <div class="card-header">
          <div class="avatar-box">
            <img :src="user.avatar" />
            <span class="status-dot"></span>
          </div>
          <div class="basic-info">
            <h3>{{ user.name }} <span class="age">{{ user.age }}岁</span></h3>
            <span class="community-tag">{{ user.community }}</span>
          </div>
          <div class="risk-badge">{{ user.riskLabel }}</div>
        </div>

        <div class="card-body">
          <div class="health-metrics">
            <div class="metric">
              <span class="label">心率</span>
              <span class="val">{{ user.hr }} <small>bpm</small></span>
            </div>
            <div class="metric">
              <span class="label">血压</span>
              <span class="val">{{ user.bp }} <small>mmHg</small></span>
            </div>
          </div>
          <div class="recent-alert" v-if="user.lastAlert">
            <el-icon><Warning /></el-icon>
            <span>最近告警: {{ user.lastAlert }}</span>
          </div>
        </div>

        <div class="card-footer">
          <el-button link type="primary">详细档案</el-button>
          <el-button link type="primary">健康趋势</el-button>
          <el-divider direction="vertical" />
          <el-button link icon="Phone">联系家属</el-button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Search, Warning, Phone, Plus, Download } from '@element-plus/icons-vue'

const search = ref('')
const riskLevel = ref('')
const community = ref('')

const mockUsers = [
  { id: 1, name: '张大爷', age: 72, community: '阳光花园 3-102', risk: 'high', riskLabel: '高风险', hr: 98, bp: '155/95', lastAlert: '2小时前 血压异常', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1' },
  { id: 2, name: '李婆婆', age: 68, community: '阳光花园 5-201', risk: 'normal', riskLabel: '正常', hr: 72, bp: '120/80', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2' },
  { id: 3, name: '王叔叔', age: 75, community: '长乐里 A栋', risk: 'medium', riskLabel: '中风险', hr: 85, bp: '140/90', lastAlert: '昨日 跌倒预警', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3' },
  { id: 4, name: '赵奶奶', age: 81, community: '长乐里 C栋', risk: 'normal', riskLabel: '正常', hr: 68, bp: '115/75', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4' }
]
</script>

<style scoped>
.user-management {
  padding: 32px;
  background: #F8FAFF;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  
  h2 { font-size: 28px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
  p { color: #64748B; font-size: 15px; }
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 32px;
}

.stat-card {
  padding: 24px;
  border-radius: 24px;
  background: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);

  .label { font-size: 14px; color: #64748B; }
  .value-row {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-top: 8px;
  }
  .value { font-size: 32px; font-weight: 800; color: #1E293B; }
  .trend { font-size: 14px; font-weight: 600; &.up { color: #10B981; } &.down { color: #EF4444; } }
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  padding: 16px 24px;
  background: white;
  border-radius: 20px;
  margin-bottom: 32px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);

  .filter-group { display: flex; gap: 16px; }
}

.user-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
}

.user-bento-card {
  background: white;
  border-radius: 32px;
  padding: 24px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;

  &:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05); }

  &.high { border-color: #FEE2E2; .risk-badge { background: #EF4444; color: white; } }
  &.medium { border-color: #FEF3C7; .risk-badge { background: #F59E0B; color: white; } }
  &.normal { border-color: #DBEAFE; .risk-badge { background: #3B82F6; color: white; } }

  .card-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
    position: relative;
  }

  .avatar-box {
    position: relative;
    img { width: 64px; height: 64px; border-radius: 20px; background: #F1F5F9; }
    .status-dot { position: absolute; bottom: -2px; right: -2px; width: 14px; height: 14px; background: #10B981; border: 3px solid white; border-radius: 50%; }
  }

  .basic-info {
    h3 { font-size: 20px; font-weight: 700; .age { font-size: 14px; color: #64748B; font-weight: 400; } }
    .community-tag { font-size: 13px; color: #94A3B8; margin-top: 4px; display: block; }
  }

  .risk-badge { position: absolute; top: 0; right: 0; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }

  .health-metrics {
    display: flex;
    gap: 32px;
    background: #F8FAFF;
    padding: 16px;
    border-radius: 20px;
    margin-bottom: 16px;

    .metric {
      display: flex;
      flex-direction: column;
      .label { font-size: 12px; color: #64748B; margin-bottom: 4px; }
      .val { font-size: 18px; font-weight: 700; color: #1E293B; small { font-size: 12px; font-weight: 400; color: #94A3B8; } }
    }
  }

  .recent-alert {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #EF4444;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 16px;
  }

  .card-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-top: 16px;
    border-top: 1px solid #F1F5F9;
  }
}
</style>
