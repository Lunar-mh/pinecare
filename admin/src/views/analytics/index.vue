<script setup lang="ts">
import { computed } from 'vue'

interface MonthData {
  month: string
  elders: number
  family: number
}

interface ProgressItem {
  label: string
  value: number
  color: string
}

interface VolunteerRank {
  rank: number
  name: string
  hours: number
  sessions: number
  color: string
}

const overviewStats = [
  { label: '新增用户', value: '128', unit: '人', trend: '+12%', up: true },
  { label: '月活用户', value: '1,024', unit: '人', trend: '+8%', up: true },
  { label: '服务次数', value: '3,571', unit: '次', trend: '+15%', up: true },
  { label: '平均响应时长', value: '4.2', unit: '分钟', trend: '-0.8', up: true },
]

const growthData: MonthData[] = [
  { month: '10月', elders: 80, family: 40 },
  { month: '11月', elders: 95, family: 50 },
  { month: '12月', elders: 110, family: 60 },
  { month: '1月', elders: 100, family: 55 },
  { month: '2月', elders: 120, family: 65 },
  { month: '3月', elders: 128, family: 72 },
]

const maxGrowth = computed(() => {
  return Math.max(...growthData.map(d => d.elders + d.family))
})

const healthMetrics: ProgressItem[] = [
  { label: '血压达标率', value: 78, color: '#01579b' },
  { label: '血糖达标率', value: 65, color: '#43a047' },
  { label: '体重达标率', value: 72, color: '#fb8c00' },
  { label: '用药依从率', value: 85, color: '#8e24aa' },
]

const moduleUsage: ProgressItem[] = [
  { label: '用药提醒', value: 92, color: '#01579b' },
  { label: 'AI健康咨询', value: 78, color: '#43a047' },
  { label: 'AI伴聊', value: 71, color: '#fb8c00' },
  { label: '健康档案', value: 68, color: '#8e24aa' },
  { label: '家庭空间', value: 55, color: '#e53935' },
  { label: '时间银行', value: 48, color: '#00838f' },
  { label: 'GPS追踪', value: 42, color: '#6d4c41' },
  { label: '医疗资源', value: 35, color: '#546e7a' },
]

const volunteerRanks: VolunteerRank[] = [
  { rank: 1, name: '张建国', hours: 42, sessions: 18, color: '#f5a623' },
  { rank: 2, name: '李淑华', hours: 38, sessions: 15, color: '#9b9b9b' },
  { rank: 3, name: '王明远', hours: 31, sessions: 13, color: '#b07d49' },
  { rank: 4, name: '刘桂芳', hours: 27, sessions: 11, color: '#4a90d9' },
  { rank: 5, name: '陈文博', hours: 22, sessions: 9, color: '#4a90d9' },
]
</script>

<template>
  <div class="analytics-page">
    <div class="page-title">数据分析</div>

    <!-- 本月概览 -->
    <el-row :gutter="16" class="overview-row">
      <el-col v-for="stat in overviewStats" :key="stat.label" :span="6">
        <el-card class="stat-card">
          <div class="stat-label">{{ stat.label }}</div>
          <div class="stat-value">{{ stat.value }}<span class="stat-unit">{{ stat.unit }}</span></div>
          <div class="stat-trend" :class="stat.up ? 'trend-up' : 'trend-down'">
            {{ stat.up ? '▲' : '▼' }} {{ stat.trend }} 较上月
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <!-- 用户增长趋势 -->
      <el-col :span="14">
        <el-card class="chart-card">
          <template #header>
            <div class="chart-header">用户增长趋势（近6个月）</div>
          </template>
          <div class="bar-chart">
            <div v-for="d in growthData" :key="d.month" class="bar-group">
              <div class="bar-stack">
                <div
                  class="bar-segment bar-family"
                  :style="{ height: (d.family / maxGrowth * 160) + 'px' }"
                  :title="'家属: ' + d.family + '人'"
                ></div>
                <div
                  class="bar-segment bar-elder"
                  :style="{ height: (d.elders / maxGrowth * 160) + 'px' }"
                  :title="'长辈: ' + d.elders + '人'"
                ></div>
              </div>
              <div class="bar-label">{{ d.month }}</div>
            </div>
          </div>
          <div class="bar-legend">
            <span class="legend-dot" style="background:#01579b"></span><span>长辈用户</span>
            <span class="legend-dot" style="background:#43a047"></span><span>家属用户</span>
          </div>
        </el-card>
      </el-col>

      <!-- 健康指标达标率 -->
      <el-col :span="10">
        <el-card class="chart-card">
          <template #header>
            <div class="chart-header">健康指标达标率</div>
          </template>
          <div class="progress-list">
            <div v-for="item in healthMetrics" :key="item.label" class="progress-item">
              <div class="progress-label">
                <span>{{ item.label }}</span>
                <span class="progress-value">{{ item.value }}%</span>
              </div>
              <el-progress
                :percentage="item.value"
                :color="item.color"
                :show-text="false"
                :stroke-width="10"
              />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top:16px">
      <!-- 服务模块使用频率 -->
      <el-col :span="14">
        <el-card class="chart-card">
          <template #header>
            <div class="chart-header">服务模块使用频率（本月）</div>
          </template>
          <div class="progress-list">
            <div v-for="item in moduleUsage" :key="item.label" class="progress-item">
              <div class="progress-label">
                <span>{{ item.label }}</span>
                <span class="progress-value">{{ item.value }}%</span>
              </div>
              <el-progress
                :percentage="item.value"
                :color="item.color"
                :show-text="false"
                :stroke-width="8"
              />
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 志愿者效率排行 -->
      <el-col :span="10">
        <el-card class="chart-card">
          <template #header>
            <div class="chart-header">本月志愿者排行（前5）</div>
          </template>
          <div class="rank-list">
            <div v-for="v in volunteerRanks" :key="v.rank" class="rank-item">
              <span class="rank-badge" :style="{ background: v.color }">{{ v.rank }}</span>
              <span class="rank-name">{{ v.name }}</span>
              <span class="rank-detail">{{ v.hours }}小时 / {{ v.sessions }}次</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.analytics-page { max-width: 1200px; }
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }

.overview-row { margin-bottom: 16px; }
.stat-card { border-radius: 8px; text-align: center; padding: 4px 0; }
.stat-label { font-size: 13px; color: #888; margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: 700; color: #1a1a1a; line-height: 1.2; }
.stat-unit { font-size: 14px; font-weight: 400; color: #666; margin-left: 4px; }
.stat-trend { font-size: 12px; margin-top: 6px; }
.trend-up { color: #43a047; }
.trend-down { color: #e53935; }

.chart-card { border-radius: 8px; }
.chart-header { font-size: 15px; font-weight: 600; color: #1a1a1a; }

.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 180px;
  padding: 0 8px;
}
.bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.bar-stack {
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 2px;
  width: 100%;
}
.bar-segment {
  width: 100%;
  border-radius: 3px 3px 0 0;
  min-height: 4px;
  transition: height 0.3s;
}
.bar-elder { background: #01579b; }
.bar-family { background: #43a047; }
.bar-label { font-size: 12px; color: #888; white-space: nowrap; }
.bar-legend {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
  font-size: 12px;
  color: #666;
}
.legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 4px;
}

.progress-list { display: flex; flex-direction: column; gap: 14px; }
.progress-item {}
.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #333;
  margin-bottom: 6px;
}
.progress-value { color: #888; }

.rank-list { display: flex; flex-direction: column; gap: 12px; }
.rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.rank-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rank-name { flex: 1; font-size: 14px; color: #1a1a1a; }
.rank-detail { font-size: 12px; color: #888; }
</style>
