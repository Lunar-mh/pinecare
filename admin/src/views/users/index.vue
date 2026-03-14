<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Warning, Phone, Plus, Download } from '@element-plus/icons-vue'

interface UserCard {
  id: number
  name: string
  age: number
  community: string
  communityCode: 'yg' | 'cl'
  risk: 'high' | 'medium' | 'normal'
  riskLabel: string
  hr: number
  bp: string
  lastAlert?: string
  avatar: string
  familyPhone: string
}

const router = useRouter()
const search = ref('')
const riskLevel = ref<UserCard['risk'] | ''>('')
const community = ref<UserCard['communityCode'] | ''>('')
const selectedUser = ref<UserCard | null>(null)
const profileDrawerVisible = ref(false)

const mockUsers = ref<UserCard[]>([
  {
    id: 1,
    name: '张大爷',
    age: 72,
    community: '阳光花园 3-102',
    communityCode: 'yg',
    risk: 'high',
    riskLabel: '高风险',
    hr: 98,
    bp: '155/95',
    lastAlert: '2 小时前 血压异常',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
    familyPhone: '13800000001',
  },
  {
    id: 2,
    name: '李婆婆',
    age: 68,
    community: '阳光花园 5-201',
    communityCode: 'yg',
    risk: 'normal',
    riskLabel: '正常',
    hr: 72,
    bp: '120/80',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
    familyPhone: '13800000002',
  },
  {
    id: 3,
    name: '王叔叔',
    age: 75,
    community: '长乐里 A 栋',
    communityCode: 'cl',
    risk: 'medium',
    riskLabel: '中风险',
    hr: 85,
    bp: '140/90',
    lastAlert: '昨日 跌倒预警',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
    familyPhone: '13800000003',
  },
  {
    id: 4,
    name: '赵奶奶',
    age: 81,
    community: '长乐里 C 栋',
    communityCode: 'cl',
    risk: 'normal',
    riskLabel: '正常',
    hr: 68,
    bp: '115/75',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
    familyPhone: '13800000004',
  },
])

const filteredUsers = computed(() => {
  const keyword = search.value.trim().toLowerCase()

  return mockUsers.value.filter((user) => {
    const matchText = !keyword
      || [user.name, user.community, user.bp, user.familyPhone].join(' ').toLowerCase().includes(keyword)
    const matchRisk = !riskLevel.value || user.risk === riskLevel.value
    const matchCommunity = !community.value || user.communityCode === community.value

    return matchText && matchRisk && matchCommunity
  })
})

const totalUsers = computed(() => filteredUsers.value.length)
const highRiskUsers = computed(() => filteredUsers.value.filter((u) => u.risk === 'high').length)
const normalUsers = computed(() => filteredUsers.value.filter((u) => u.risk === 'normal').length)

function openProfile(user: UserCard): void {
  selectedUser.value = user
  profileDrawerVisible.value = true
}

function handleAddProfile(): void {
  ElMessage.info('演示环境：已打开“新增档案”流程入口（可按需接入真实表单）')
}

function handleExport(): void {
  const rows = filteredUsers.value
  const header = 'ID,姓名,年龄,社区,风险级别,心率,血压,家属电话'
  const body = rows
    .map((u) => [u.id, u.name, u.age, u.community, u.riskLabel, u.hr, u.bp, u.familyPhone].join(','))
    .join('\n')
  const content = `${header}\n${body}`
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `users-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('已导出当前筛选结果')
}

function handleTrend(user: UserCard): void {
  void router.push({ path: '/health', query: { userId: String(user.id) } })
}

function handleContact(user: UserCard): void {
  void navigator.clipboard?.writeText(user.familyPhone)
  ElMessage.success(`已复制家属电话：${user.familyPhone}`)
}
</script>

<template>
  <div class="user-management">
    <header class="page-header">
      <div class="title-section">
        <h2>全域老人健康档案</h2>
        <p>当前筛选共 {{ totalUsers }} 位，含高风险 {{ highRiskUsers }} 位，正常 {{ normalUsers }} 位。</p>
      </div>
      <div class="action-section">
        <el-button type="primary" round :icon="Plus" @click="handleAddProfile">新增档案</el-button>
        <el-button round :icon="Download" @click="handleExport">导出报表</el-button>
      </div>
    </header>

    <section class="stats-overview">
      <div class="stat-card glass-panel">
        <span class="label">当前筛选人数</span>
        <div class="value-row">
          <span class="value">{{ totalUsers }}</span>
          <span class="trend up">实时</span>
        </div>
      </div>
      <div class="stat-card glass-panel">
        <span class="label">高风险人数</span>
        <div class="value-row">
          <span class="value">{{ highRiskUsers }}</span>
          <span class="trend down">优先跟进</span>
        </div>
      </div>
      <div class="stat-card glass-panel">
        <span class="label">正常人数</span>
        <div class="value-row">
          <span class="value">{{ normalUsers }}</span>
          <span class="trend">稳定</span>
        </div>
      </div>
    </section>

    <nav class="filter-bar glass-panel">
      <div class="filter-group" style="flex:1; min-width: 260px;">
        <el-input v-model="search" placeholder="姓名、社区、血压、家属电话" :prefix-icon="Search" clearable />
      </div>
      <div class="filter-group">
        <el-select v-model="riskLevel" placeholder="风险等级" clearable>
          <el-option label="高风险(红色)" value="high" />
          <el-option label="中风险(黄色)" value="medium" />
          <el-option label="正常(蓝色)" value="normal" />
        </el-select>
        <el-select v-model="community" placeholder="所属社区" clearable>
          <el-option label="阳光花园" value="yg" />
          <el-option label="长乐里" value="cl" />
        </el-select>
      </div>
    </nav>

    <main class="user-grid">
      <div v-for="user in filteredUsers" :key="user.id" class="user-bento-card glass-panel" :class="user.risk">
        <div class="card-header">
          <div class="avatar-box">
            <img :src="user.avatar" alt="avatar" />
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
            <span>最近告警：{{ user.lastAlert }}</span>
          </div>
        </div>

        <div class="card-footer">
          <el-button link type="primary" @click="openProfile(user)">详细档案</el-button>
          <el-button link type="primary" @click="handleTrend(user)">健康趋势</el-button>
          <el-divider direction="vertical" />
          <el-button link :icon="Phone" @click="handleContact(user)">联系家属</el-button>
        </div>
      </div>
    </main>

    <el-drawer v-model="profileDrawerVisible" :title="selectedUser ? `${selectedUser.name} · 档案详情` : '档案详情'" size="420px">
      <template v-if="selectedUser">
        <div class="wb-list">
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">基础信息</span>
              <span class="wb-list-desc">{{ selectedUser.age }} 岁，{{ selectedUser.community }}</span>
            </div>
          </div>
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">健康指标</span>
              <span class="wb-list-desc">心率 {{ selectedUser.hr }} bpm，血压 {{ selectedUser.bp }}</span>
            </div>
          </div>
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">风险级别</span>
              <span class="wb-list-desc">{{ selectedUser.riskLabel }}</span>
            </div>
          </div>
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">家属联系</span>
              <span class="wb-list-desc">{{ selectedUser.familyPhone }}</span>
            </div>
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; margin-top: 16px; gap: 8px;">
          <el-button @click="handleTrend(selectedUser)">查看健康趋势</el-button>
          <el-button type="primary" @click="handleContact(selectedUser)">复制家属电话</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.user-management {
  padding: 32px;
  background: #f8faff;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.page-header h2 {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.page-header p {
  color: #64748b;
  font-size: 15px;
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
}

.stat-card .label {
  font-size: 14px;
  color: #64748b;
}

.value-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-top: 8px;
}

.value {
  font-size: 32px;
  font-weight: 800;
  color: #1e293b;
}

.trend {
  font-size: 14px;
  font-weight: 600;
}

.trend.up {
  color: #10b981;
}

.trend.down {
  color: #ef4444;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 24px;
  background: white;
  border-radius: 20px;
  margin-bottom: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
}

.filter-group {
  display: flex;
  gap: 16px;
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
}

.user-bento-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05);
}

.user-bento-card.high {
  border-color: #fee2e2;
}

.user-bento-card.medium {
  border-color: #fef3c7;
}

.user-bento-card.normal {
  border-color: #dbeafe;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  position: relative;
}

.avatar-box {
  position: relative;
}

.avatar-box img {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: #f1f5f9;
}

.status-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  background: #10b981;
  border: 3px solid white;
  border-radius: 50%;
}

.basic-info h3 {
  font-size: 20px;
  font-weight: 700;
}

.basic-info .age {
  font-size: 14px;
  color: #64748b;
  font-weight: 400;
}

.community-tag {
  font-size: 13px;
  color: #94a3b8;
  margin-top: 4px;
  display: block;
}

.risk-badge {
  position: absolute;
  top: 0;
  right: 0;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.user-bento-card.high .risk-badge {
  background: #ef4444;
}

.user-bento-card.medium .risk-badge {
  background: #f59e0b;
}

.user-bento-card.normal .risk-badge {
  background: #3b82f6;
}

.health-metrics {
  display: flex;
  gap: 32px;
  background: #f8faff;
  padding: 16px;
  border-radius: 20px;
  margin-bottom: 16px;
}

.metric {
  display: flex;
  flex-direction: column;
}

.metric .label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
}

.metric .val {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.metric .val small {
  font-size: 12px;
  font-weight: 400;
  color: #94a3b8;
}

.recent-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ef4444;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 16px;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}
</style>
