<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getAdminFamilyBindings } from '@/services'
import type { FamilyBindingItem } from '@/services'

const loading = ref(false)
const search = ref('')
const status = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const list = ref<FamilyBindingItem[]>([])

const activeBindings = computed(() => list.value.filter((item) => item.status === 'active').length)
const withArchive = computed(() => list.value.filter((item) => item.healthArchive.id).length)

function displayName(item: FamilyBindingItem): string {
  return item.elderProfile.realName || item.elderProfile.nickname || `Elder #${item.elderId}`
}

async function fetchBindings() {
  loading.value = true
  try {
    const data = await getAdminFamilyBindings({
      page: page.value,
      pageSize: pageSize.value,
      search: search.value || undefined,
      status: status.value || undefined,
    })

    list.value = data.list || []
    total.value = data.pagination?.total || 0
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load family bindings.'
    ElMessage.error(message)
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

watch([search, status], () => {
  page.value = 1
  fetchBindings()
})

onMounted(fetchBindings)
</script>

<template>
  <div class="family-page">
    <div class="page-header">
      <span class="page-title">Family Bindings (Admin)</span>
      <el-button :icon="Refresh" @click="fetchBindings">Refresh</el-button>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #01579b">{{ total }}</div>
          <div class="stat-label">Total Bindings</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #2e7d32">{{ activeBindings }}</div>
          <div class="stat-label">Active (Current Page)</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-num" style="color: #e65100">{{ withArchive }}</div>
          <div class="stat-label">With Health Archive (Current Page)</div>
        </div>
      </el-col>
    </el-row>

    <el-card class="filter-card">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input
            v-model="search"
            placeholder="Search elder/family name, phone or binding ID"
            :prefix-icon="Search"
            clearable
          />
        </el-col>
        <el-col :span="5">
          <el-select v-model="status" placeholder="Status" clearable style="width: 100%">
            <el-option label="active" value="active" />
            <el-option label="inactive" value="inactive" />
            <el-option label="disabled" value="disabled" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="table-card">
      <el-table :data="list" stripe style="width: 100%" v-loading="loading">
        <el-table-column label="Binding ID" width="100" prop="bindingId" />
        <el-table-column label="Elder" min-width="180">
          <template #default="{ row }">
            <div>{{ displayName(row) }}</div>
            <div class="sub-text">Elder ID: {{ row.elderId }}</div>
          </template>
        </el-table-column>
        <el-table-column label="Family ID" width="100" prop="familyId" />
        <el-table-column label="Gender" width="90">
          <template #default="{ row }">
            {{ row.elderProfile.gender || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="Age" width="90">
          <template #default="{ row }">
            {{ row.elderProfile.age ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="Bound At" min-width="170" prop="boundAt" />
        <el-table-column label="Status" width="110">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-pagination">
        <el-pagination
          v-model:current-page="page"
          layout="total, prev, pager, next"
          :total="total"
          :page-size="pageSize"
          @current-change="fetchBindings"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.family-page { max-width: 1200px; }
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
.sub-text { font-size: 12px; color: #999; }
</style>
