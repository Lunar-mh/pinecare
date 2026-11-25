<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Refresh,
  ArrowRight,
  User,
  Location,
  CircleCheckFilled,
} from '@element-plus/icons-vue'
import { useECharts } from '@/composables/useECharts'
import { getRecentActivities, getDashboardStats } from '@/services'
import type { ActivityItem, DashboardOverviewStats } from '@/services'
import {
  eventDesc,
  formatEventStatus,
  formatEventType,
  formatEventUser,
  formatTime,
  isDanger,
} from './formatters'
import { buildRadarChartOption, buildTrendChartOption } from './chartOptions'

const router = useRouter()
const recentEvents = ref<ActivityItem[]>([])
const eventsLoading = ref(false)
const statsLoading = ref(false)

const dashboardStats = ref<DashboardOverviewStats>({
  communityCoverage: 88,
  systemLoad: 24,
  activeElders: 126,
  pendingAlerts: 0,
  mapCenter: { lat: 31.2304, lng: 121.4737 },
  mapZoom: 14.5,
})

const trendChartRef = ref<HTMLElement | null>(null)
const radarChartRef = ref<HTMLElement | null>(null)
const { setOption: setTrendOption } = useECharts(trendChartRef)
const { setOption: setRadarOption } = useECharts(radarChartRef)

const QUICK_ROUTES: Record<string, string> = {
  sos: '/sos',
  users: '/users',
  analytics: '/analytics',
  health: '/health',
}

async function fetchRecentEvents() {
  eventsLoading.value = true
  try {
    recentEvents.value = await getRecentActivities(6)
  } catch (error: unknown) {
    recentEvents.value = []
    ElMessage.error(error instanceof Error ? error.message : '实时事件加载失败')
  } finally {
    eventsLoading.value = false
  }
}

function handleEventClick(item: ActivityItem) {
  router.push(isDanger(item) || formatEventType(item.type).includes('SOS') ? '/sos' : '/users')
}

function quickAction(type: string) {
  const target = QUICK_ROUTES[type]
  if (target) router.push(target)
}

async function fetchDashboardStats() {
  statsLoading.value = true
  try {
    const stats = await getDashboardStats()
    if (stats) {
      dashboardStats.value = {
        communityCoverage: stats.communityCoverage || 88,
        systemLoad: stats.systemLoad || 22,
        activeElders: stats.activeElders || 120,
        pendingAlerts: stats.pendingAlerts || 0,
        mapCenter: stats.mapCenter?.lat ? stats.mapCenter : { lat: 31.2304, lng: 121.4737 },
        mapZoom: stats.mapZoom || 14.5,
      }
    }
    setTrendOption(buildTrendChartOption(dashboardStats.value.pendingAlerts))
    setRadarOption(buildRadarChartOption(dashboardStats.value.pendingAlerts))
  } catch (error: unknown) {
    ElMessage.error(error instanceof Error ? error.message : '看板态势加载失败')
  } finally {
    statsLoading.value = false
  }
}

const mapCoordinates = computed(() => {
  const { lat, lng } = dashboardStats.value.mapCenter
  if (lat === 0 && lng === 0) return '定位中...'
  return `${lng.toFixed(3)}°E, ${lat.toFixed(3)}°N`
})

onMounted(() => {
  fetchRecentEvents()
  fetchDashboardStats()
})
</script>

<template>
  <div class="yao-dashboard warm-jade-theme">
    <!-- 无障碍屏幕阅读器播报 -->
    <div aria-live="polite" aria-atomic="true" class="sr-only" role="status">
      {{ statsLoading ? '全域态势数据加载中' : '' }}
      {{ eventsLoading ? '实时事件流加载中' : '' }}
      {{ dashboardStats.pendingAlerts > 0 ? `当前有 ${dashboardStats.pendingAlerts} 条待处理紧急告警` : '当前全域态势平稳' }}
    </div>

    <!-- 顶部全景核心指标看板卡片组 (消除暗黑极客顶栏，代以暖玉微晶指标浮雕) -->
    <div class="wb-metric-grid top-summary-grid">
      <div class="wb-metric-card" @click="quickAction('health')" style="cursor: pointer;" title="点击查看健康监管">
        <div class="metric-top">
          <span class="wb-card-label">社区适老覆盖率</span>
          <span class="badge-pill jade">达标运行</span>
        </div>
        <div class="wb-card-value">
          {{ dashboardStats.communityCoverage }}<small>%</small>
        </div>
        <div class="progress-track" role="progressbar" :aria-valuenow="dashboardStats.communityCoverage" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-fill" :style="{ width: `${dashboardStats.communityCoverage}%` }"></div>
        </div>
        <span class="wb-card-hint">网格化入户随访达标率</span>
      </div>

      <div class="wb-metric-card">
        <div class="metric-top">
          <span class="wb-card-label">智能传感负载</span>
          <span class="badge-pill safe">状态优良</span>
        </div>
        <div class="wb-card-value">
          {{ dashboardStats.systemLoad }}<small>%</small>
        </div>
        <div class="progress-track" role="progressbar" :aria-valuenow="dashboardStats.systemLoad" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-fill load-fill" :style="{ width: `${dashboardStats.systemLoad}%` }"></div>
        </div>
        <span class="wb-card-hint">毫米波雷达与健康外设并发</span>
      </div>

      <div class="wb-metric-card" @click="quickAction('users')" style="cursor: pointer;" title="点击查看在册长者">
        <div class="metric-top">
          <span class="wb-card-label">在线重点守护长者</span>
          <el-icon class="card-icon jade"><User /></el-icon>
        </div>
        <div class="wb-card-value">
          {{ dashboardStats.activeElders }}<small>位</small>
        </div>
        <span class="wb-card-hint">今日已完成体征同步长者</span>
      </div>

      <div 
        class="wb-metric-card alert-card" 
        :class="{ 'has-danger': dashboardStats.pendingAlerts > 0 }"
        @click="quickAction('sos')" 
        style="cursor: pointer;" 
        title="点击进入 SOS 应急响应中心"
      >
        <div class="metric-top">
          <span class="wb-card-label">待处置风险预警</span>
          <span :class="['badge-pill', dashboardStats.pendingAlerts > 0 ? 'danger' : 'safe']">
            {{ dashboardStats.pendingAlerts > 0 ? '需即刻处置' : '态势安稳' }}
          </span>
        </div>
        <div class="wb-card-value" :style="{ color: dashboardStats.pendingAlerts > 0 ? 'var(--wb-danger)' : 'var(--wb-primary)' }">
          {{ dashboardStats.pendingAlerts }}<small>起</small>
        </div>
        <span class="wb-card-hint">涵盖 SOS 跌倒与体征骤变</span>
      </div>
    </div>

    <!-- 主展示区域：三栏微晶排版 -->
    <div class="dashboard-main-layout">
      <!-- 左栏：风险态势与 24h 告警趋势 (真实 ECharts) -->
      <aside class="dashboard-column left-column" aria-label="风险预测与态势">
        <div class="wb-panel radar-panel">
          <div class="panel-header">
            <div>
              <span class="panel-tag">态势雷达</span>
              <h3 class="panel-title">全域健康风险雷达</h3>
            </div>
            <div class="quick-btns">
              <el-button size="small" type="primary" @click="quickAction('sos')">处理报警</el-button>
              <el-button size="small" @click="quickAction('users')">长者清单</el-button>
            </div>
          </div>
          <!-- 真实 ECharts 雷达图容器 -->
          <div ref="radarChartRef" class="chart-container" style="height: 220px;"></div>
        </div>

        <div class="wb-panel trend-panel">
          <div class="panel-header">
            <div>
              <span class="panel-tag">趋势预测</span>
              <h3 class="panel-title">24h 告警趋势监测</h3>
            </div>
            <el-button link type="primary" :icon="ArrowRight" @click="quickAction('analytics')">
              分析详情
            </el-button>
          </div>
          <!-- 真实 ECharts 折线图容器，消除原先假 SVG 静态图形 -->
          <div ref="trendChartRef" class="chart-container" style="height: 200px;"></div>
        </div>
      </aside>

      <!-- 中栏：社区网格与数字孪生全景 (温润暖玉微晶底座) -->
      <main class="dashboard-column center-column" aria-label="社区网格数字孪生">
        <div class="twin-base-jade">
          <div class="twin-watermark">青松安护社区网格</div>
          <div class="twin-map-canvas">
            <!-- 社区建筑温润立体浮雕 -->
            <div class="building b1" title="幸福里智慧养老服务中心"></div>
            <div class="building b2" title="常青藤颐养日间照料站"></div>
            <div class="building b3" title="松柏康养社区服务驿站"></div>

            <!-- 在线长者与告警脉冲热点 -->
            <el-tooltip :content="`在册在线长者: ${dashboardStats.activeElders} 位`" placement="top">
              <div class="point-marker point-active" role="img" aria-label="在线长者分布中心">
                <span class="marker-pulse"></span>
                <span class="marker-dot"></span>
              </div>
            </el-tooltip>

            <el-tooltip 
              :content="dashboardStats.pendingAlerts > 0 ? `待处置紧急告警: ${dashboardStats.pendingAlerts} 起 (点击查看)` : '当前片区无紧急求助'" 
              placement="top"
            >
              <div 
                class="point-marker point-sos" 
                :class="{ 'is-active-alert': dashboardStats.pendingAlerts > 0 }"
                @click="quickAction('sos')"
                role="button"
                tabindex="0"
                aria-label="应急告警点位"
              >
                <span v-if="dashboardStats.pendingAlerts > 0" class="marker-pulse-danger"></span>
                <span class="marker-dot-sos"></span>
              </div>
            </el-tooltip>
          </div>

          <!-- 地图微晶 HUD 浮层 -->
          <div class="map-hud-jade">
            <div class="hud-info">
              <el-icon><Location /></el-icon>
              <span>中心坐标：{{ mapCoordinates }} · 视野缩放：{{ dashboardStats.mapZoom.toFixed(1) }}x</span>
            </div>
            <div class="hud-legends">
              <div class="legend-item"><span class="legend-dot jade"></span><span>在线守护 ({{ dashboardStats.activeElders }})</span></div>
              <div class="legend-item"><span class="legend-dot vermilion"></span><span>急救预警 ({{ dashboardStats.pendingAlerts }})</span></div>
              <div class="legend-item"><span class="legend-dot amber"></span><span>网格守护员就绪</span></div>
            </div>
          </div>
        </div>
      </main>

      <!-- 右栏：实时全域事件流与资源调度 -->
      <aside class="dashboard-column right-column" aria-label="实时事件流与处置效率">
        <div class="wb-panel stream-panel">
          <div class="panel-header">
            <div>
              <span class="panel-tag">事件响应</span>
              <h3 class="panel-title">实时全域事件流</h3>
            </div>
            <el-button link :icon="Refresh" :loading="eventsLoading" @click="fetchRecentEvents">
              刷新
            </el-button>
          </div>

          <div class="event-stream-list" v-loading="eventsLoading">
            <div 
              v-for="item in recentEvents" 
              :key="item.id" 
              class="event-card-item"
              :class="{ 'is-danger-item': isDanger(item) }"
              @click="handleEventClick(item)"
              role="button"
              tabindex="0"
            >
              <div class="event-card-top">
                <span class="event-user-badge">{{ formatEventUser(item.user) }}</span>
                <span class="event-time-stamp">{{ formatTime(item.time) }}</span>
              </div>
              <div class="event-card-content">
                <p class="event-main-desc">{{ eventDesc(item) }}</p>
                <span :class="['event-status-tag', isDanger(item) ? 'danger-tag' : 'normal-tag']">
                  {{ formatEventStatus(item.status) }}
                </span>
              </div>
            </div>
            <div v-if="!eventsLoading && recentEvents.length === 0" class="empty-events">
              <el-icon><CircleCheckFilled /></el-icon>
              <span>当前暂无待处理告警事件</span>
            </div>
          </div>
        </div>

        <div class="wb-panel efficiency-panel">
          <div class="panel-header">
            <div>
              <span class="panel-tag">服务时效</span>
              <h3 class="panel-title">资源响应与履约率</h3>
            </div>
          </div>
          <div class="efficiency-grid">
            <div class="efficiency-item">
              <div class="efficiency-num">98.6<small>%</small></div>
              <span class="efficiency-label">SOS 响应达标率</span>
              <span class="efficiency-hint">30秒内接单率</span>
            </div>
            <div class="efficiency-item">
              <div class="efficiency-num amber">94.2<small>%</small></div>
              <span class="efficiency-label">上门处置核销率</span>
              <span class="efficiency-hint">平均处置耗时 8.5min</span>
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

/* ======================================================== */
/* 暖玉微晶全景主题 (彻底替代原先 cyber-theme 暗黑风格)      */
/* ======================================================== */
.yao-dashboard.warm-jade-theme {
  display: flex;
  flex-direction: column;
  gap: 22px;
  color: var(--wb-text);
}

/* 顶部指标卡片 */
.top-summary-grid {
  margin-bottom: 0;
}

.metric-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.badge-pill {
  font-size: 14px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  line-height: 1.2;
}

.badge-pill.jade {
  background: rgba(31, 107, 86, 0.1);
  color: #1F6B56;
  border: 1px solid rgba(31, 107, 86, 0.2);
}

.badge-pill.safe {
  background: rgba(79, 141, 102, 0.1);
  color: #4F8D66;
  border: 1px solid rgba(79, 141, 102, 0.2);
}

.badge-pill.danger {
  background: rgba(211, 56, 51, 0.12);
  color: #D33833;
  border: 1px solid rgba(211, 56, 51, 0.25);
  animation: pulse-danger 2s infinite;
}

.card-icon {
  font-size: 22px;
}

.card-icon.jade {
  color: var(--wb-primary);
}

.progress-track {
  width: 100%;
  height: 6px;
  background: rgba(210, 225, 218, 0.5);
  border-radius: 999px;
  margin-top: 14px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #1F6B56, #438470);
  transition: width 0.6s ease;
}

.progress-fill.load-fill {
  background: linear-gradient(90deg, #4A7594, #6B94B2);
}

.alert-card.has-danger {
  border-color: rgba(211, 56, 51, 0.4) !important;
  box-shadow: 0 4px 20px rgba(211, 56, 51, 0.12) !important;
}

/* 三栏布局 */
.dashboard-main-layout {
  display: grid;
  grid-template-columns: 340px 1fr 340px;
  gap: 22px;
  min-height: 560px;
}

.dashboard-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 栏目面板通用 */
.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
}

.panel-tag {
  display: inline-block;
  font-size: 14px;
  font-weight: 700;
  color: #5C6E66;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--wb-text);
  margin: 0;
}

.chart-container {
  width: 100%;
}

/* 中栏：暖玉微晶数字孪生底座 */
.twin-base-jade {
  width: 100%;
  height: 100%;
  min-height: 540px;
  background: radial-gradient(circle at center, rgba(31, 107, 86, 0.04) 0%, rgba(248, 246, 240, 0.95) 100%),
              linear-gradient(135deg, rgba(255, 255, 255, 0.85), rgba(241, 234, 223, 0.7));
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(210, 225, 218, 0.8);
  box-shadow: var(--wb-glass-shadow);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.twin-watermark {
  position: absolute;
  top: 24px;
  left: 28px;
  font-size: 20px;
  font-weight: 800;
  color: rgba(31, 107, 86, 0.12);
  letter-spacing: 2px;
  pointer-events: none;
}

.twin-map-canvas {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 社区微晶建筑几何块 */
.building {
  position: absolute;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(210, 225, 218, 0.8);
  box-shadow: 0 12px 28px rgba(31, 55, 45, 0.08);
  transition: all 0.3s ease;
}

.building:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 36px rgba(31, 55, 45, 0.14);
}

.building.b1 {
  width: 130px;
  height: 90px;
  top: 28%;
  left: 26%;
}

.building.b2 {
  width: 150px;
  height: 110px;
  top: 48%;
  left: 48%;
}

.building.b3 {
  width: 100px;
  height: 80px;
  top: 22%;
  left: 64%;
}

/* 点位与脉冲 */
.point-marker {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
}

.point-active {
  top: 45%;
  left: 38%;
}

.marker-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #1F6B56;
  border: 3px solid #ffffff;
  box-shadow: 0 2px 8px rgba(31, 107, 86, 0.4);
}

.marker-pulse {
  position: absolute;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(31, 107, 86, 0.2);
  animation: pulse-spread 2.4s infinite;
}

.point-sos {
  top: 56%;
  left: 68%;
  cursor: pointer;
}

.marker-dot-sos {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #D33833;
  border: 3px solid #ffffff;
  box-shadow: 0 2px 8px rgba(211, 56, 51, 0.4);
}

.marker-pulse-danger {
  position: absolute;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(211, 56, 51, 0.25);
  animation: pulse-spread 1.6s infinite;
}

/* 地图底部 HUD */
.map-hud-jade {
  padding: 16px 24px;
  background: rgba(255, 253, 250, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid rgba(210, 225, 218, 0.7);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hud-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--wb-text-soft);
}

.hud-legends {
  display: flex;
  align-items: center;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--wb-text);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-dot.jade { background: #1F6B56; }
.legend-dot.vermilion { background: #D33833; }
.legend-dot.amber { background: #C86D3B; }

/* 右栏：实时事件流卡片 */
.event-stream-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 380px;
  overflow-y: auto;
  padding-right: 4px;
}

.event-card-item {
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(227, 216, 200, 0.8);
  border-radius: 14px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.event-card-item:hover {
  background: #ffffff;
  border-color: var(--wb-primary);
  transform: translateX(2px);
  box-shadow: 0 4px 12px rgba(31, 55, 45, 0.06);
}

.event-card-item.is-danger-item {
  border-color: rgba(211, 56, 51, 0.35);
  background: rgba(254, 242, 242, 0.8);
}

.event-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.event-user-badge {
  font-size: 14px;
  font-weight: 700;
  color: var(--wb-text);
}

.event-time-stamp {
  font-size: 14px;
  color: var(--wb-text-soft);
}

.event-card-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.event-main-desc {
  font-size: 14px;
  color: var(--wb-text-soft);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-status-tag {
  font-size: 14px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  flex-shrink: 0;
}

.event-status-tag.normal-tag {
  background: rgba(31, 107, 86, 0.1);
  color: #1F6B56;
}

.event-status-tag.danger-tag {
  background: rgba(211, 56, 51, 0.15);
  color: #D33833;
}

.empty-events {
  padding: 32px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--wb-text-soft);
  font-size: 14px;
}

.empty-events .el-icon {
  font-size: 32px;
  color: #1F6B56;
}

/* 履约效率卡片 */
.efficiency-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.efficiency-item {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(227, 216, 200, 0.7);
  border-radius: 16px;
  padding: 16px;
  text-align: center;
}

.efficiency-num {
  font-size: 30px;
  font-weight: 700;
  color: #1F6B56;
  line-height: 1.1;
}

.efficiency-num.amber {
  color: #C86D3B;
}

.efficiency-num small {
  font-size: 14px;
  font-weight: 600;
}

.efficiency-label {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--wb-text);
  margin-top: 8px;
}

.efficiency-hint {
  display: block;
  font-size: 14px;
  color: var(--wb-text-soft);
  margin-top: 4px;
}

/* 动效 */
@keyframes pulse-danger {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}

@keyframes pulse-spread {
  0% { transform: scale(0.6); opacity: 0.8; }
  100% { transform: scale(2.2); opacity: 0; }
}

/* 响应式 */
@media (max-width: 1280px) {
  .dashboard-main-layout {
    grid-template-columns: 1fr;
  }
}
</style>
