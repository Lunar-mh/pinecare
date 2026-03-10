<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import {
  getMedicalHospitals,
  getMedicalDepartments,
  getMedicalDoctors,
  getAdminMedicalReports,
} from '@/services'
import type {
  MedicalHospitalItem,
  MedicalDepartmentItem,
  MedicalDoctorItem,
  MedicalReportItem,
} from '@/services'

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

const directoryTotal = computed(
  () => hospitals.value.length + departments.value.length + doctors.value.length
)

async function fetchHospitals() {
  try {
    const data = await getMedicalHospitals()
    hospitals.value = data.list || []

    if (hospitals.value.length > 0 && !hospitalId.value) {
      const firstId = Number(hospitals.value[0]?.id)
      hospitalId.value = Number.isFinite(firstId) ? firstId : null
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load hospitals.'
    ElMessage.error(message)
    hospitals.value = []
  }
}

async function fetchDepartments() {
  if (!hospitalId.value) {
    departments.value = []
    return
  }

  try {
    const data = await getMedicalDepartments(hospitalId.value)
    departments.value = data.list || []

    if (departments.value.length > 0) {
      const firstId = Number(departments.value[0]?.id)
      departmentId.value = Number.isFinite(firstId) ? firstId : null
    } else {
      departmentId.value = null
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load departments.'
    ElMessage.error(message)
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
    const message = err instanceof Error ? err.message : 'Failed to load doctors.'
    ElMessage.error(message)
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
    const message = err instanceof Error ? err.message : 'Failed to load reports.'
    ElMessage.error(message)
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
  <div class="medical-page">
    <div class="page-header">
      <span class="page-title">Medical Resources</span>
      <el-button :icon="Refresh" @click="fetchAll">Refresh</el-button>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-num" style="color: #01579b">{{ hospitals.length }}</div>
          <div class="stat-label">Hospitals</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-num" style="color: #2e7d32">{{ departments.length }}</div>
          <div class="stat-label">Departments</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-num" style="color: #e65100">{{ doctors.length }}</div>
          <div class="stat-label">Doctors</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-num" style="color: #6a1b9a">{{ reportTotal }}</div>
          <div class="stat-label">Reports</div>
        </div>
      </el-col>
    </el-row>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="Directory" name="directory">
        <el-card class="filter-card">
          <el-row :gutter="12">
            <el-col :span="8">
              <el-select v-model="hospitalId" placeholder="Hospital" style="width: 100%" clearable>
                <el-option
                  v-for="item in hospitals"
                  :key="String(item.id)"
                  :label="item.name"
                  :value="Number(item.id)"
                />
              </el-select>
            </el-col>
            <el-col :span="8">
              <el-select v-model="departmentId" placeholder="Department" style="width: 100%" clearable>
                <el-option
                  v-for="item in departments"
                  :key="String(item.id)"
                  :label="item.name"
                  :value="Number(item.id)"
                />
              </el-select>
            </el-col>
            <el-col :span="8" class="summary-text">Directory Rows: {{ directoryTotal }}</el-col>
          </el-row>
        </el-card>

        <el-card class="table-card" style="margin-bottom: 16px">
          <template #header>
            <span>Hospitals</span>
          </template>
          <el-table :data="hospitals" stripe style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="ID" width="100" />
            <el-table-column prop="name" label="Name" min-width="220" />
            <el-table-column prop="level" label="Level" width="100" />
            <el-table-column prop="city" label="City" width="120" />
          </el-table>
        </el-card>

        <el-card class="table-card" style="margin-bottom: 16px">
          <template #header>
            <span>Departments</span>
          </template>
          <el-table :data="departments" stripe style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="ID" width="100" />
            <el-table-column prop="hospitalId" label="Hospital ID" width="120" />
            <el-table-column prop="name" label="Name" min-width="220" />
          </el-table>
        </el-card>

        <el-card class="table-card">
          <template #header>
            <span>Doctors</span>
          </template>
          <el-table :data="doctors" stripe style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="ID" width="100" />
            <el-table-column prop="departmentId" label="Department ID" width="140" />
            <el-table-column prop="name" label="Name" min-width="220" />
            <el-table-column prop="title" label="Title" width="200" />
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="Reports" name="reports">
        <el-card class="filter-card">
          <el-row :gutter="12">
            <el-col :span="6">
              <el-input
                v-model="reportSearch"
                placeholder="Search by user/phone/reportNo/id"
                :prefix-icon="Search"
                clearable
              />
            </el-col>
            <el-col :span="4">
              <el-input v-model="reportType" placeholder="Type" clearable />
            </el-col>
            <el-col :span="4">
              <el-date-picker
                v-model="reportStartDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="Start date"
                style="width: 100%"
              />
            </el-col>
            <el-col :span="4">
              <el-date-picker
                v-model="reportEndDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="End date"
                style="width: 100%"
              />
            </el-col>
          </el-row>
        </el-card>

        <el-card class="table-card">
          <el-table :data="reports" stripe style="width: 100%" v-loading="reportsLoading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="userName" label="User" width="120" />
            <el-table-column prop="userPhone" label="Phone" width="150" />
            <el-table-column prop="reportNo" label="Report No" width="180" />
            <el-table-column prop="reportType" label="Type" width="120" />
            <el-table-column prop="reportDate" label="Date" width="130" />
            <el-table-column prop="syncStatus" label="Sync Status" width="120" />
            <el-table-column label="Report URL" min-width="220">
              <template #default="{ row }">
                <a v-if="row.reportUrl" :href="row.reportUrl" target="_blank" rel="noreferrer">{{ row.reportUrl }}</a>
                <span v-else>-</span>
              </template>
            </el-table-column>
          </el-table>

          <div class="table-pagination">
            <el-pagination
              v-model:current-page="reportPage"
              layout="total, prev, pager, next"
              :total="reportTotal"
              :page-size="reportPageSize"
              @current-change="fetchReports"
            />
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.medical-page { max-width: 1200px; }
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.page-title { font-size: 20px; font-weight: 600; color: #1a1a1a; }
.stats-row { margin-bottom: 16px; }
.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
.stat-num { font-size: 32px; font-weight: 700; line-height: 1.2; }
.stat-label { font-size: 13px; color: #999; margin-top: 4px; }
.filter-card { margin-bottom: 16px; border-radius: 8px; }
.table-card { border-radius: 8px; }
.table-pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
.summary-text {
  line-height: 32px;
  color: #666;
}
</style>
