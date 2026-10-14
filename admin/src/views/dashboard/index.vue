<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getRecentActivities, getDashboardStats, getSystemStats } from '@/services'
import type { ActivityItem } from '@/services'

const router = useRouter()
const recentEvents = ref<ActivityItem[]>([])
const eventsLoading = ref(false)

// 动态统计数据
const dashboardStats = ref({
  communityCoverage: 0,
  systemLoad: 0,
  activeElders: 0,
  pendingAlerts: 0,
  mapCenter: { lat: 0, lng: 0 },
  mapZoom: 14.5,
})
const statsLoading = ref(false)

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--:--'
  return date.toLocaleTimeString('zh-CN', { hour12: false })
}

function eventDesc(item: ActivityItem): string {
  return `${formatEventType(item.type)} - ${formatEventStatus(item.status)}`
}

function isDanger(item: ActivityItem): boolean {
  const normalizedStatus = item.status.toLowerCase()
  const normalizedType = item.type.toLowerCase()
  return normalizedStatus.includes('trigger') || normalizedType.includes('sos')
}

function formatEventType(value: string): string {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return '未知事件'
  if (normalized.includes('sos')) return 'SOS 事件'
  if (normalized.includes('fall')) return '跌倒告警'
  if (normalized.includes('medication')) return '用药告警'
  if (normalized.includes('gps') || normalized.includes('location')) return '定位告警'
  return String(value || '')
}

function formatEventStatus(value: string): string {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return '未知状态'
  if (normalized.includes('trigger')) return '触发中'
  if (normalized.includes('confirm')) return '已确认'
  if (normalized.includes('resolve') || normalized.includes('complete')) return '已解决'
  if (normalized.includes('cancel')) return '已取消'
  if (normalized.includes('pending')) return '待处理'
  if (normalized.includes('processing')) return '处理中'
  return String(value || '')
}

function formatEventUser(value: string): string {
  const raw = String(value || '').trim()
  const elderMatch = /^elder[_-]?(\d+)$/i.exec(raw)
  if (elderMatch) return `长辈${elderMatch[1]}`
  const familyMatch = /^family[_-]?(\d+)$/i.exec(raw)
  if (familyMatch) return `家属${familyMatch[1]}`
  const volunteerMatch = /^volunteer[_-]?(\d+)$/i.exec(raw)
  if (volunteerMatch) return `志愿者${volunteerMatch[1]}`
  return raw || '匿名用户'
}

async function fetchRecentEvents() {
  eventsLoading.value = true
  try {
    recentEvents.value = await getRecentActivities(5)
  } catch (error: unknown) {
    recentEvents.value = []
    ElMessage.error(error instanceof Error ? error.message : '实时事件加载失败')
  } finally {
    eventsLoading.value = false
  }
}

function handleEventClick(item: ActivityItem) {
  if (isDanger(item) || formatEventType(item.type).includes('SOS')) {
    router.push('/sos')
  } else {
    router.push('/users')
  }
}

function quickAction(type: string) {
  if (type === 'sos') router.push('/sos')
  if (type === 'users') router.push('/users')
  if (type === 'analytics') router.push('/analytics')
}

// 加载统计数据
async function fetchDashboardStats() {
  statsLoading.value = true
  try {
    const stats = await getDashboardStats()
    if (stats) {
      dashboardStats.value = {
        communityCoverage: stats.communityCoverage || 0,
        systemLoad: stats.systemLoad || 0,
        activeElders: stats.activeElders || 0,
        pendingAlerts: stats.pendingAlerts || 0,
        mapCenter: stats.mapCenter || { lat: 0, lng: 0 },
        mapZoom: stats.mapZoom || 14.5,
      }
    }
  } catch (error) {
    console.error('Failed to load dashboard stats:', error)
  } finally {
    statsLoading.value = false
  }
}

// 格式化坐标显示
const mapCoordinates = computed(() => {
  const { lat, lng } = dashboardStats.value.mapCenter
  if (lat === 0 && lng === 0) return '定位中...'
  return `${lng.toFixed(3)}, ${lat.toFixed(3)}`
})

onMounted(() => {
  fetchRecentEvents()
  fetchDashboardStats()
})
</script>

<template>
  <div class="yao-dashboard cyber-theme">
    <!-- 屏幕阅读器的实时通知区域 -->
    <div 
      aria-live="polite" 
      aria-atomic="true" 
      class="sr-only" 
      role="status"
    >
      {{ statsLoading ? '统计数据加载中' : '' }}
      {{ eventsLoading ? '实时事件加载中' : '' }}
      {{ dashboardStats.pendingAlerts > 0 ? `当前有 ${dashboardStats.pendingAlerts} 条待处理告警` : '' }}
    </div>

    <!-- 顶部全景导航 -->
    <nav class="cyber-nav" role="navigation" aria-label="主导航栏">
      <div class="brand" aria-label="品牌信息">
        <div class="logo-orb" aria-hidden="true"></div>
        <div class="brand-text">
          <h1>曜银·全域智慧指挥系统</h1>
          <p>全域智慧指挥系统 v3.0</p>
        </div>
      </div>
      <div 
        class="global-stats" 
        v-loading="statsLoading"
        :aria-busy="statsLoading"
        aria-label="全局统计数据"
        aria-describedby="stats-description"
      >
        <div id="stats-description" class="sr-only">显示社区覆盖率和系统负载的实时统计数据</div>
        <div class="stat-group" role="group" aria-label="社区覆盖率">
          <span class="label">社区覆盖率</span>
          <div class="progress-bar" role="progressbar" :aria-valuenow="dashboardStats.communityCoverage" aria-valuemin="0" aria-valuemax="100"><div class="fill" :style="{ width: `${dashboardStats.communityCoverage}%` }"></div></div>
        </div>
        <div class="stat-group" role="group" aria-label="系统负载">
          <span class="label">系统负载</span>
          <span class="value" role="status">{{ dashboardStats.systemLoad }}%</span>
        </div>
      </div>
    </nav>

    <div class="cyber-layout">
      <!-- 左侧：AI 预测与态势 -->
      <aside class="side-panel left" role="complementary" aria-label="风险预测和告警部分">
        <div class="cyber-card glass-v2 radar-section">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="card-tag" aria-label="卡片标签：风险雷达">风险雷达</div>
            <div class="quick-actions" role="group" aria-label="快速操作">
              <el-button 
                size="small" 
                type="primary" 
                plain 
                @click="quickAction('sos')"
                aria-label="处理报警 - 跳转到告警管理页面"
              >处理报警</el-button>
              <el-button 
                size="small" 
                @click="quickAction('users')"
                aria-label="人员管理 - 跳转到人员管理页面"
              >人员</el-button>
            </div>
          </div>
          <h3 class="card-title">全域健康风险雷达</h3>
          <el-tooltip 
            :content="dashboardStats.pendingAlerts > 0 ? `当前有 ${dashboardStats.pendingAlerts} 条待处理告警` : '系统运行正常，暂无紧急告警'" 
            placement="right"
          >
            <div 
              class="radar-view" 
              style="cursor:help;"
              role="img"
              :aria-label="`风险雷达：${dashboardStats.pendingAlerts > 0 ? dashboardStats.pendingAlerts + '条告警' : '无告警'}`"
              aria-describedby="radar-tooltip"
            >
              <div id="radar-tooltip" class="sr-only">{{ dashboardStats.pendingAlerts > 0 ? `当前有 ${dashboardStats.pendingAlerts} 条待处理告警` : '系统运行正常，暂无紧急告警' }}</div>
              <div class="radar-beam"></div>
              <div class="radar-circles">
                <span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>
              </div>
            </div>
          </el-tooltip>
        </div>
        <div class="cyber-card glass-v2 trend-section">
          <div class="card-tag" aria-label="卡片标签：趋势分析">趋势分析</div>
          <h3 class="card-title">24h 告警趋势预测</h3>
          <el-tooltip content="点击查看详细报表" placement="right">
            <div 
              class="trend-mock-chart" 
              @click="quickAction('analytics')"
              @keydown.enter="quickAction('analytics')"
              style="cursor:pointer;"
              role="button"
              tabindex="0"
              aria-label="24小时告警趋势图 - 点击查看详细分析报表"
            >
              <svg viewBox="0 0 400 150" aria-hidden="true">
                <path d="M0,100 Q50,80 100,120 T200,60 T300,90 T400,40" fill="none" stroke="var(--glow-blue)" stroke-width="3" />
                <path d="M0,100 Q50,80 100,120 T200,60 T300,90 T400,40 V150 H0 Z" fill="url(#grad)" opacity="0.2" />
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--glow-blue)" />
                    <stop offset="100%" stop-color="transparent" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </el-tooltip>
        </div>
      </aside>

      <!-- 中间：核心数字孪生 -->
      <main class="main-map-center" role="main" aria-label="数字孪生地图显示区域">
        <div class="twin-base">
          <div class="map-grid-layer" aria-hidden="true"></div>
          <div class="twin-map">
            <!-- 模拟 3D 建筑与点位 -->
            <div class="building b1" aria-hidden="true"></div>
            <div class="building b2" aria-hidden="true"></div>
            <el-tooltip :content="`在线长辈: ${dashboardStats.activeElders}人`" placement="top">
              <div 
                class="point-p1 active-pulse" 
                style="cursor:pointer;"
                role="img"
                :aria-label="`在线老人标记：${dashboardStats.activeElders}人在线`"
              ></div>
            </el-tooltip>
            <el-tooltip 
              :content="dashboardStats.pendingAlerts > 0 ? `待处理告警: ${dashboardStats.pendingAlerts}条` : '暂无紧急告警'" 
              placement="top"
            >
              <div 
                class="point-p2" 
                :class="dashboardStats.pendingAlerts > 0 ? 'alert-pulse' : 'active-pulse'" 
                style="cursor:pointer;" 
                @click="quickAction('sos')"
                @keydown.enter="quickAction('sos')"
                role="button"
                tabindex="0"
                :aria-label="`紧急告警标记：${dashboardStats.pendingAlerts > 0 ? dashboardStats.pendingAlerts + '条告警' : '无告警'} - 点击查看详情`"
              ></div>
            </el-tooltip>
          </div>
          <div class="map-hud-overlay" aria-label="地图信息显示">
            <div class="hud-top" role="status">坐标：{{ mapCoordinates }} | 缩放：{{ dashboardStats.mapZoom.toFixed(1) }}x</div>
            <div class="hud-bottom" role="group" aria-label="地图图例">
              <div class="legend-item"><i class="dot blue" aria-hidden="true"></i> <span>在线老人 ({{ dashboardStats.activeElders }})</span></div>
              <div class="legend-item"><i class="dot red" aria-hidden="true"></i> <span>紧急呼叫 ({{ dashboardStats.pendingAlerts }})</span></div>
              <div class="legend-item"><i class="dot gold" aria-hidden="true"></i> <span>志愿者中转</span></div>
            </div>
          </div>
        </div>
      </main>

      <!-- 右侧：指令中心与实时流 -->
      <aside class="side-panel right" role="complementary" aria-label="实时事件和资源调度部分">
        <div class="cyber-card glass-v2 stream-section">
          <div class="card-tag" aria-label="卡片标签：实时事件">实时事件</div>
          <h3 class="card-title">实时全域事件流</h3>
          <div 
            class="event-stream" 
            v-loading="eventsLoading"
            role="feed"
            aria-live="polite"
            aria-label="实时事件流"
            :aria-busy="eventsLoading"
            aria-atomic="false"
          >
            <div 
              v-for="item in recentEvents" 
              :key="item.id" 
              class="event-item" 
              :class="{ danger: isDanger(item) }"
              @click="handleEventClick(item)"
              @keydown.enter="handleEventClick(item)"
              style="cursor:pointer;"
              role="article"
              tabindex="0"
              :aria-label="`${formatEventUser(item.user)} - ${eventDesc(item)} - ${formatTime(item.time)}`"
            >
              <div class="event-time" aria-hidden="true">{{ formatTime(item.time) }}</div>
              <div class="event-body">
                <span class="user">{{ formatEventUser(item.user) }}</span>
                <p>{{ eventDesc(item) }}</p>
              </div>
            </div>
            <div v-if="!eventsLoading && recentEvents.length === 0" class="event-empty" role="status">暂无实时事件</div>
          </div>
        </div>
        <div class="cyber-card glass-v2 dispatch-section">
          <div class="card-tag" aria-label="卡片标签：调度执行">调度执行</div>
          <h3 class="card-title">资源调度效率</h3>
          <div class="circle-stats" role="group" aria-label="调度效率统计">
            <div class="c-item">
              <svg viewBox="0 0 36 36" role="img" aria-label="响应率"><path class="bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /><path class="val" stroke-dasharray="85, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /></svg>
              <span>响应率</span>
            </div>
            <div class="c-item">
              <svg viewBox="0 0 36 36" role="img" aria-label="周转率"><path class="bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /><path class="val yellow" stroke-dasharray="62, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /></svg>
              <span>周转率</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.cyber-theme {
  --glow-blue: #00F3FF;
  --glow-red: #FF4D4F;
  --glow-gold: #F09236;
  --bg-deep: #020617;
  
  background: var(--bg-deep);
  min-height: 100vh;
  color: #E2E8F0;
  padding: 0 24px 24px;
}

/* 顶部导航升级 */
.cyber-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px 0;
  
  .brand {
    display: flex;
    align-items: center;
    gap: 20px;
    
    .logo-orb {
      width: 48px; height: 48px;
      background: radial-gradient(circle, var(--glow-blue) 0%, transparent 70%);
      box-shadow: 0 0 30px var(--glow-blue);
      border-radius: 50%;
      animation: orbitPulse 3s infinite;
    }
    
    h1 { font-size: 28px; font-weight: 800; letter-spacing: 4px; margin: 0; }
    p { font-size: 10px; color: #64748B; margin-top: 4px; }
  }
}

.cyber-layout {
  display: flex;
  gap: 24px;
  height: calc(100vh - 120px);
}

.side-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.main-map-center {
  flex: 2.5;
  position: relative;
}

/* 玻璃拟态 2.0 */
.glass-v2 {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 32px;
  padding: 24px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(0, 243, 255, 0.3), transparent);
  }
}

.card-tag {
  font-size: 10px;
  color: var(--glow-blue);
  letter-spacing: 2px;
  margin-bottom: 8px;
  font-weight: 700;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 24px;
}

/* 数字孪生地图底座 */
.twin-base {
  width: 100%; height: 100%;
  background: radial-gradient(circle at center, #0B1D3A 0%, var(--bg-deep) 100%);
  border-radius: 48px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;

  .map-grid-layer {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(0, 243, 255, 0.1) 1px, transparent 1px);
    background-size: 40px 40px;
    transform: perspective(1000px) rotateX(60deg) translateY(-200px);
    opacity: 0.3;
  }
}

.active-pulse {
  position: absolute;
  top: 40%; left: 30%;
  width: 12px; height: 12px;
  background: var(--glow-blue);
  border-radius: 50%;
  box-shadow: 0 0 20px var(--glow-blue);
}

.alert-pulse {
  position: absolute;
  top: 60%; left: 70%;
  width: 12px; height: 12px;
  background: var(--glow-red);
  border-radius: 50%;
  animation: mapAlert 1s infinite;
}

@keyframes mapAlert {
  0% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.7); }
  100% { box-shadow: 0 0 0 30px rgba(255, 77, 79, 0); }
}

/* 实时事件流 */
.event-stream {
  display: flex;
  flex-direction: column;
  gap: 16px;
  
  .event-item {
    padding: 16px;
    background: rgba(255,255,255,0.02);
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.05);
    transition: all 0.3s ease;
    
    &.danger { border-left: 4px solid var(--glow-red); background: rgba(255, 77, 79, 0.05); }
    
    &:focus {
      outline: 2px solid var(--glow-blue);
      outline-offset: 2px;
      background: rgba(0, 243, 255, 0.08);
    }
    
    &:hover {
      border-color: rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.05);
    }
    
    .event-time { font-size: 12px; color: #64748B; margin-bottom: 4px; }
    .user { font-weight: 700; color: #CBD5E1; }
    p { font-size: 13px; color: #94A3B8; margin-top: 4px; }
  }
}

.event-empty {
  padding: 24px 16px;
  border-radius: 20px;
  text-align: center;
  color: #94A3B8;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.15);
}

/* 键盘焦点和可交互元素样式 */
[role="button"],
[role="img"],
.trend-mock-chart,
.point-p2 {
  &:focus {
    outline: 2px solid var(--glow-blue);
    outline-offset: 2px;
    box-shadow: 0 0 8px rgba(0, 243, 255, 0.5);
  }
  
  &:focus-visible {
    outline: 2px solid var(--glow-blue);
    outline-offset: 2px;
  }
}

/* 确保按钮具有好的焦点状态 */
:deep(.el-button):focus {
  outline: 2px solid var(--glow-blue);
  outline-offset: 2px;
}

@keyframes orbitPulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
}

/* ========== 响应式断点 ========== */

/* 平板横屏 (< 1280px) */
@media (max-width: 1280px) {
  .cyber-layout {
    flex-direction: column;
    height: auto;
    min-height: calc(100vh - 120px);
  }
  
  .main-map-center {
    order: -1;
    height: 400px;
    flex: none;
  }
  
  .side-panel {
    flex-direction: row;
    flex-wrap: wrap;
    
    .cyber-card {
      flex: 1;
      min-width: 280px;
    }
  }
}

/* 平板竖屏 (< 1024px) */
@media (max-width: 1024px) {
  .cyber-nav {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 20px 0;
    
    .brand h1 {
      font-size: 22px;
      letter-spacing: 2px;
    }
    
    .global-stats {
      width: 100%;
    }
  }
  
  .glass-v2 {
    border-radius: 20px;
    padding: 18px;
  }
  
  .card-title {
    font-size: 16px;
    margin-bottom: 16px;
  }
  
  .main-map-center {
    height: 320px;
  }
}

/* 手机 (< 768px) */
@media (max-width: 768px) {
  .cyber-theme {
    padding: 0 12px 12px;
  }
  
  .cyber-nav {
    padding: 16px 0;
    
    .brand {
      gap: 12px;
      
      .logo-orb {
        width: 36px;
        height: 36px;
      }
      
      h1 {
        font-size: 18px;
        letter-spacing: 1px;
      }
    }
    
    .global-stats {
      flex-direction: column;
      gap: 12px;
      
      .stat-group {
        width: 100%;
      }
    }
  }
  
  .cyber-layout {
    gap: 16px;
  }
  
  .side-panel {
    flex-direction: column;
    gap: 12px;
  }
  
  .glass-v2 {
    border-radius: 16px;
    padding: 14px;
  }
  
  .card-title {
    font-size: 15px;
    margin-bottom: 12px;
  }
  
  .main-map-center {
    height: 280px;
  }
  
  .hud-top,
  .hud-bottom {
    font-size: 10px;
    padding: 6px 10px !important;
  }
  
  .event-stream .event-item {
    padding: 10px;
    border-radius: 14px;
  }
  
  .dispatch-section .c-grid {
    gap: 8px;
    
    .c-item {
      font-size: 10px;
      
      svg {
        width: 36px;
        height: 36px;
      }
    }
  }
}

/* 小屏手机 (< 375px) */
@media (max-width: 375px) {
  .cyber-nav .brand h1 {
    font-size: 16px;
  }
  
  .glass-v2 {
    padding: 12px;
  }
  
  .main-map-center {
    height: 220px;
  }
}
</style>

