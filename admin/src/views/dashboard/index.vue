<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getRecentActivities } from '@/services'
import type { ActivityItem } from '@/services'

const router = useRouter()
const recentEvents = ref<ActivityItem[]>([])
const eventsLoading = ref(false)

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

onMounted(fetchRecentEvents)
</script>

<template>
  <div class="yao-dashboard cyber-theme">
    <!-- 顶部全景导航 -->
    <nav class="cyber-nav">
      <div class="brand">
        <div class="logo-orb"></div>
        <div class="brand-text">
          <h1>曜银·全域智慧指挥系统</h1>
          <p>全域智慧指挥系统 v3.0</p>
        </div>
      </div>
      <div class="global-stats">
        <div class="stat-group">
          <span class="label">社区覆盖率</span>
          <div class="progress-bar"><div class="fill" style="width: 92%"></div></div>
        </div>
        <div class="stat-group">
          <span class="label">系统负载</span>
          <span class="value">12%</span>
        </div>
      </div>
    </nav>

    <div class="cyber-layout">
      <!-- 左侧：AI 预测与态势 -->
      <aside class="side-panel left">
        <div class="cyber-card glass-v2 radar-section">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="card-tag">风险雷达</div>
            <div class="quick-actions">
              <el-button size="small" type="primary" plain @click="quickAction('sos')">处理报警</el-button>
              <el-button size="small" @click="quickAction('users')">人员</el-button>
            </div>
          </div>
          <h3 class="card-title">全域健康风险雷达</h3>
          <el-tooltip content="实时全域高发频段预警，当前夜间跌倒告警概率上升 15%" placement="right">
            <div class="radar-view" style="cursor:help;">
              <div class="radar-beam"></div>
              <div class="radar-circles">
                <span></span><span></span><span></span>
              </div>
            </div>
          </el-tooltip>
        </div>
        <div class="cyber-card glass-v2 trend-section">
          <div class="card-tag">趋势分析</div>
          <h3 class="card-title">24h 告警趋势预测</h3>
          <el-tooltip content="点击查看详细报表" placement="right">
            <div class="trend-mock-chart" @click="quickAction('analytics')" style="cursor:pointer;">
              <svg viewBox="0 0 400 150">
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
      <main class="main-map-center">
        <div class="twin-base">
          <div class="map-grid-layer"></div>
          <div class="twin-map">
            <!-- 模拟 3D 建筑与点位 -->
            <div class="building b1"></div>
            <div class="building b2"></div>
            <el-tooltip content="长辈12号：一切正常" placement="top"><div class="point-p1 active-pulse" style="cursor:pointer;"></div></el-tooltip>
            <el-tooltip content="长辈18号：发生了跌倒，待处理" placement="top"><div class="point-p2 alert-pulse" style="cursor:pointer;" @click="quickAction('sos')"></div></el-tooltip>
          </div>
          <div class="map-hud-overlay">
            <div class="hud-top">坐标：116.397, 39.908 | 缩放：14.5x</div>
            <div class="hud-bottom">
              <div class="legend-item"><i class="dot blue"></i> 在线老人</div>
              <div class="legend-item"><i class="dot red"></i> 紧急呼叫</div>
              <div class="legend-item"><i class="dot gold"></i> 志愿者中转</div>
            </div>
          </div>
        </div>
      </main>

      <!-- 右侧：指令中心与实时流 -->
      <aside class="side-panel right">
        <div class="cyber-card glass-v2 stream-section">
          <div class="card-tag">实时事件</div>
          <h3 class="card-title">实时全域事件流</h3>
          <div class="event-stream" v-loading="eventsLoading">
            <div 
              v-for="item in recentEvents" 
              :key="item.id" 
              class="event-item" 
              :class="{ danger: isDanger(item) }"
              @click="handleEventClick(item)"
              style="cursor:pointer;"
            >
              <div class="event-time">{{ formatTime(item.time) }}</div>
              <div class="event-body">
                <span class="user">{{ formatEventUser(item.user) }}</span>
                <p>{{ eventDesc(item) }}</p>
              </div>
            </div>
            <div v-if="!eventsLoading && recentEvents.length === 0" class="event-empty">暂无实时事件</div>
          </div>
        </div>
        <div class="cyber-card glass-v2 dispatch-section">
          <div class="card-tag">调度执行</div>
          <h3 class="card-title">资源调度效率</h3>
          <div class="circle-stats">
            <div class="c-item">
              <svg viewBox="0 0 36 36"><path class="bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /><path class="val" stroke-dasharray="85, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /></svg>
              <span>响应率</span>
            </div>
            <div class="c-item">
              <svg viewBox="0 0 36 36"><path class="bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /><path class="val yellow" stroke-dasharray="62, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /></svg>
              <span>周转率</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
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
    
    &.danger { border-left: 4px solid var(--glow-red); background: rgba(255, 77, 79, 0.05); }
    
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

@keyframes orbitPulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
}
</style>

