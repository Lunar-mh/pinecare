<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { getAdminMedicalReports, getMedicalDepartments, getMedicalDoctors, getMedicalHospitals } from '@/services'
import type { MedicalDepartmentItem, MedicalDoctorItem, MedicalHospitalItem, MedicalReportItem } from '@/services'

const loading = ref(false)
const reportsLoading = ref(false)
const activeTab = ref<'directory' | 'reports'>('directory')
const hospitals = ref<MedicalHospitalItem[]>([])
const departments = ref<MedicalDepartmentItem[]>([])
const doctors = ref<MedicalDoctorItem[]>([])
const reports = ref<MedicalReportItem[]>([])
const reportSearch = ref('')
const reportType = ref('')
const reportStartDate = ref('')
const reportEndDate = ref('')
const reportPage = ref(1)
const reportPageSize = ref(10)
const reportTotal = ref(0)
const hospitalId = ref<number | null>(null)
const departmentId = ref<number | null>(null)

const directoryTotal = computed(() => hospitals.value.length + departments.value.length + doctors.value.length)
const reportLinkedCount = computed(() => reports.value.filter(item => item.reportUrl).length)

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
    ElMessage.error(err instanceof Error ? err.message : '医院目录加载失败')
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
  reportsLoading.value = true
  try {
    const data = await getAdminMedicalReports({
      page: reportPage.value,
      pageSize: reportPageSize.value,
      search: reportSearch.value || undefined,
      reportType: reportType.value || undefined,
      startDate: reportStartDate.value || undefined,
      endDate: reportEndDate.value || undefined,
    })
    reports.value = data.list || []
    reportTotal.value = data.pagination?.total || 0
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '医疗报告加载失败')
    reports.value = []
    reportTotal.value = 0
  } finally {
    reportsLoading.value = false
  }
}

async function fetchAll() {
  loading.value = true
  try {
    await fetchHospitals()
    await fetchDepartments()
    await fetchDoctors()
    await fetchReports()
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
        <span class="wb-page-title">医疗资源</span>
        <span class="wb-page-subtitle">把医疗目录、科室医生和同步报告收在同一个资源枢纽里，方便社区与医院协同。</span>
      </div>
      <el-button :icon="Refresh" @click="fetchAll">刷新资源</el-button>
    </div>

    <div class="wb-metric-grid">
      <div class="wb-metric-card">
        <span class="wb-card-label">医院数</span>
        <div class="wb-card-value">{{ hospitals.length }}</div>
        <span class="wb-card-hint">当前医疗目录已接入的医院资源</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">科室数</span>
        <div class="wb-card-value">{{ departments.length }}</div>
        <span class="wb-card-hint">随当前医院切换动态更新</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">医生数</span>
        <div class="wb-card-value">{{ doctors.length }}</div>
        <span class="wb-card-hint">用于安排就诊与转诊连接</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">报告数</span>
        <div class="wb-card-value">{{ reportTotal }}</div>
        <span class="wb-card-hint">同步过来的报告记录总量</span>
      </div>
    </div>

    <div class="wb-panel">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="资源目录" name="directory">
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
                <span class="wb-chip">目录总项 {{ directoryTotal }}</span>
              </el-col>
            </el-row>
          </div>

          <div class="wb-grid-2">
            <div class="wb-panel">
              <div class="wb-page-header" style="margin-bottom: 14px">
                <div>
                  <span class="wb-page-title" style="font-size: 22px">医院目录</span>
                  <span class="wb-page-subtitle">从这里决定科室和医生的过滤上下文。</span>
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
                  <span class="wb-page-subtitle">随所选科室更新，便于快速衔接服务。</span>
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
                <span class="wb-page-subtitle">保留完整的医院到科室映射，方便维护导流关系。</span>
              </div>
            </div>
            <el-table :data="departments" stripe v-loading="loading">
              <el-table-column prop="id" label="科室 ID" width="100" />
              <el-table-column prop="hospitalId" label="医院 ID" width="110" />
              <el-table-column prop="name" label="科室名称" min-width="220" />
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="同步报告" name="reports">
          <div class="wb-filter-card" style="margin-bottom: 16px">
            <el-row :gutter="12" align="middle">
              <el-col :span="6">
                <el-input v-model="reportSearch" :prefix-icon="Search" placeholder="搜索用户、手机号、报告号" clearable />
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
                <span class="wb-chip">含链接报告 {{ reportLinkedCount }}</span>
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
                <a v-if="row.reportUrl" :href="row.reportUrl" target="_blank" rel="noreferrer">查看原始报告</a>
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