﻿<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { getAdminMedicalReports, getMedicalDepartments, getMedicalDoctors, getMedicalHospitals, getSystemEvidence } from '@/services'
import { usePagination } from '@/composables/usePagination'
import type { MedicalDepartmentItem, MedicalDoctorItem, MedicalHospitalItem, MedicalReportItem, SystemEvidenceBundle } from '@/services'

const loading = ref(false)
const activeTab = ref<'directory' | 'reports'>('directory')
const hospitals = ref<MedicalHospitalItem[]>([])
const departments = ref<MedicalDepartmentItem[]>([])
const doctors = ref<MedicalDoctorItem[]>([])
const evidence = ref<SystemEvidenceBundle | null>(null)
const reportSearch = ref('')
const reportType = ref('')
const reportStartDate = ref('')
const reportEndDate = ref('')
const hospitalId = ref<number | null>(null)
const departmentId = ref<number | null>(null)

const {
  page: reportPage,
  pageSize: reportPageSize,
  total: reportTotal,
  list: reports,
  loading: reportsLoading,
  loadData: loadReports
} = usePagination<MedicalReportItem>(getAdminMedicalReports)

const directoryTotal = computed(() => hospitals.value.length + departments.value.length + doctors.value.length)
const reportLinkedCount = computed(() => reports.value.filter(item => item.reportUrl).length)
const medicalProvider = computed(() => evidence.value?.providerEvidence.find(item => item.key === 'medical') || null)

function syncTagType(value: string): 'success' | 'warning' | 'info' {
  if (value.includes('success') || value.includes('completed')) return 'success'
  if (value.includes('pending') || value.includes('queue')) return 'warning'
  return 'info'
}

async function fetchHospitals() {
  try {
    const data = await getMedicalHospitals()
    hospitals.value = data.list || []
    if (!hospitalId.value && hospitals.value.length > 0) {
      hospitalId.value = Number(hospitals.value[0]?.id) || null
    }
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '医疗目录加载失败')
    hospitals.value = []
  }
}

async function fetchDepartments() {
  if (!hospitalId.value) {
    departments.value = []
    departmentId.value = null
    return
  }
  try {
    const data = await getMedicalDepartments(hospitalId.value)
    departments.value = data.list || []
    departmentId.value = departments.value.length > 0 ? Number(departments.value[0]?.id) || null : null
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '科室目录加载失败')
    departments.value = []
    departmentId.value = null
  }
}

async function fetchDoctors() {
  if (!departmentId.value) {
    doctors.value = []
    return
  }
  try {
    const data = await getMedicalDoctors(departmentId.value)
    doctors.value = data.list || []
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '医生目录加载失败')
    doctors.value = []
  }
}

async function fetchReports() {
  try {
    await loadReports({
      search: reportSearch.value || undefined,
      reportType: reportType.value || undefined,
      startDate: reportStartDate.value || undefined,
      endDate: reportEndDate.value || undefined,
    })
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '医疗报告加载失败')
  }
}

async function fetchEvidence() {
  try {
    evidence.value = await getSystemEvidence()
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '医疗证据加载失败')
    evidence.value = null
  }
}

async function fetchAll() {
  loading.value = true
  try {
    await fetchHospitals()
    await fetchDepartments()
    await fetchDoctors()
    await Promise.all([fetchReports(), fetchEvidence()])
  } finally {
    loading.value = false
  }
}

watch(hospitalId, async () => {
  await fetchDepartments()
  await fetchDoctors()
})

watch(departmentId, fetchDoctors)
watch([reportSearch, reportType, reportStartDate, reportEndDate], () => {
  reportPage.value = 1
  fetchReports()
})

onMounted(fetchAll)
</script>

<template>
  <div>
    <div class="wb-page-header">
      <div>
        <span class="wb-page-title">医疗资源整合</span>
        <span class="wb-page-subtitle">目录、报告和运行模式放在一处查看，说明当前是实网就绪还是桩服务就绪。</span>
      </div>
      <div style="display:flex; gap:10px">
        <el-button :icon="Refresh" @click="fetchAll">刷新</el-button>
      </div>
    </div>

    <div class="wb-metric-grid">
      <div class="wb-metric-card" @click="activeTab = 'directory'" style="cursor: pointer;" title="查看医疗目录">
        <span class="wb-card-label">医院</span>
        <div class="wb-card-value">{{ hospitals.length }}</div>
        <span class="wb-card-hint">当前可用医院目录</span>
      </div>
      <div class="wb-metric-card" @click="activeTab = 'directory'" style="cursor: pointer;" title="查看医疗目录">
        <span class="wb-card-label">科室</span>
        <div class="wb-card-value">{{ departments.length }}</div>
        <span class="wb-card-hint">所选医院下的科室数量</span>
      </div>
      <div class="wb-metric-card" @click="activeTab = 'directory'" style="cursor: pointer;" title="查看医疗目录">
        <span class="wb-card-label">医生</span>
        <div class="wb-card-value">{{ doctors.length }}</div>
        <span class="wb-card-hint">当前目录中的医生数量</span>
      </div>
      <div class="wb-metric-card" @click="activeTab = 'reports'" style="cursor: pointer;" title="查看医疗报告">
        <span class="wb-card-label">能力模式</span>
        <div class="wb-card-value">{{ medicalProvider?.effectiveMode || 'unknown' }}</div>
        <span class="wb-card-hint">{{ medicalProvider?.lastError || '最近没有记录到错误' }}</span>
      </div>
    </div>

    <div class="wb-panel" style="margin-bottom: 20px">
      <div class="wb-page-header" style="margin-bottom: 14px">
        <div>
          <span class="wb-page-title" style="font-size: 22px">运行态证据</span>
          <span class="wb-page-subtitle">保留当前医疗模式、最近成功和回退说明。</span>
        </div>
      </div>
      <div class="wb-list">
        <div class="wb-list-item">
          <div>
            <span class="wb-list-title">请求模式</span>
            <span class="wb-list-desc">{{ medicalProvider?.requestedMode || 'auto' }}</span>
          </div>
          <el-tag :type="medicalProvider?.effectiveMode === 'live' ? 'success' : 'warning'">{{ medicalProvider?.effectiveMode || 'stub' }}</el-tag>
        </div>
        <div class="wb-list-item">
          <div>
            <span class="wb-list-title">最近成功</span>
            <span class="wb-list-desc">{{ medicalProvider?.lastSuccessAt || '暂无成功记录' }}</span>
          </div>
        </div>
        <div class="wb-list-item">
          <div>
            <span class="wb-list-title">回退策略</span>
            <span class="wb-list-desc">{{ medicalProvider?.fallbackAllowed ? '允许受控 fallback' : '当前不允许 fallback' }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="wb-panel">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="医疗目录" name="directory">
          <div class="wb-filter-card" style="margin-bottom: 16px">
            <el-row :gutter="12" align="middle">
              <el-col :span="8">
                <el-select v-model="hospitalId" placeholder="选择医院" clearable style="width: 100%">
                  <el-option v-for="item in hospitals" :key="String(item.id)" :label="item.name" :value="Number(item.id)" />
                </el-select>
              </el-col>
              <el-col :span="8">
                <el-select v-model="departmentId" placeholder="选择科室" clearable style="width: 100%">
                  <el-option v-for="item in departments" :key="String(item.id)" :label="item.name" :value="Number(item.id)" />
                </el-select>
              </el-col>
              <el-col :span="8" style="display: flex; justify-content: flex-end">
                <span class="wb-chip">目录总量 {{ directoryTotal }}</span>
              </el-col>
            </el-row>
          </div>

          <div class="wb-grid-2">
            <div class="wb-panel">
              <div class="wb-page-header" style="margin-bottom: 14px">
                <div>
                  <span class="wb-page-title" style="font-size: 22px">医院目录</span>
                  <span class="wb-page-subtitle">展示当前可查询的医院清单。</span>
                </div>
              </div>
              <el-table :data="hospitals" stripe v-loading="loading" max-height="340">
                <el-table-column prop="name" label="医院名称" min-width="200" />
                <el-table-column prop="level" label="等级" width="100" />
                <el-table-column prop="city" label="城市" width="120" />
              </el-table>
            </div>

            <div class="wb-panel">
              <div class="wb-page-header" style="margin-bottom: 14px">
                <div>
                  <span class="wb-page-title" style="font-size: 22px">医生目录</span>
                  <span class="wb-page-subtitle">和所选科室联动，便于现场切换查看。</span>
                </div>
              </div>
              <el-table :data="doctors" stripe v-loading="loading" max-height="340">
                <el-table-column prop="name" label="医生" min-width="160" />
                <el-table-column prop="title" label="职称" width="180" />
              </el-table>
            </div>
          </div>

          <div class="wb-panel" style="margin-top: 20px">
            <div class="wb-page-header" style="margin-bottom: 14px">
              <div>
                <span class="wb-page-title" style="font-size: 22px">科室目录</span>
                <span class="wb-page-subtitle">保留和医院联动的一张简洁表格。</span>
              </div>
            </div>
            <el-table :data="departments" stripe v-loading="loading">
              <el-table-column prop="id" label="科室 ID" width="100" />
              <el-table-column prop="hospitalId" label="医院 ID" width="110" />
              <el-table-column prop="name" label="科室名称" min-width="220" />
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="医疗报告" name="reports">
          <div class="wb-filter-card" style="margin-bottom: 16px">
            <el-row :gutter="12" align="middle">
              <el-col :span="6">
                <el-input v-model="reportSearch" :prefix-icon="Search" placeholder="搜索用户、手机号或报告号" clearable />
              </el-col>
              <el-col :span="4">
                <el-input v-model="reportType" placeholder="报告类型" clearable />
              </el-col>
              <el-col :span="4">
                <el-date-picker v-model="reportStartDate" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" style="width: 100%" />
              </el-col>
              <el-col :span="4">
                <el-date-picker v-model="reportEndDate" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" style="width: 100%" />
              </el-col>
              <el-col :span="6" style="display: flex; justify-content: flex-end">
                <span class="wb-chip">已挂载报告 {{ reportLinkedCount }}</span>
              </el-col>
            </el-row>
          </div>

          <el-table :data="reports" stripe v-loading="reportsLoading">
            <template #empty>
              <div style="padding: 28px; text-align: center; color: var(--wb-text-soft)">
                {{ reportsLoading ? '加载中...' : '暂无医疗报告' }}
              </div>
            </template>
            <el-table-column prop="userName" label="用户" width="120" />
            <el-table-column prop="userPhone" label="手机号" width="150" />
            <el-table-column prop="reportNo" label="报告号" width="180" />
            <el-table-column prop="reportType" label="类型" width="120" />
            <el-table-column prop="reportDate" label="报告日期" width="130" />
            <el-table-column label="同步状态" width="120">
              <template #default="{ row }">
                <el-tag :type="syncTagType(row.syncStatus)">{{ row.syncStatus }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="报告链接" min-width="220">
              <template #default="{ row }">
                <a v-if="row.reportUrl" :href="row.reportUrl" target="_blank" rel="noreferrer">查看报告</a>
                <span v-else>-</span>
              </template>
            </el-table-column>
          </el-table>
          <div style="display: flex; justify-content: flex-end; margin-top: 16px">
            <el-pagination
              v-model:current-page="reportPage"
              layout="total, prev, pager, next"
              :total="reportTotal"
              :page-size="reportPageSize"
              @current-change="fetchReports"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>




