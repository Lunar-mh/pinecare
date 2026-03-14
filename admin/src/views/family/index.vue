<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { getAdminFamilyBindings } from '@/services'
import { usePagination } from '@/composables/usePagination'
import type { FamilyBindingItem } from '@/services'

const search = ref('')
const status = ref('')
const selected = ref<FamilyBindingItem | null>(null)
const drawerVisible = ref(false)

const {
  page,
  pageSize,
  total,
  list,
  loading,
  loadData,
} = usePagination<FamilyBindingItem>(getAdminFamilyBindings, 10)

const activeBindings = computed(() => list.value.filter(item => item.status === 'active').length)
const withArchive = computed(() => list.value.filter(item => item.healthArchive.id).length)
const namedElders = computed(() => list.value.filter(item => item.elderProfile.realName || item.elderProfile.nickname).length)

function elderName(item: FamilyBindingItem): string {
  return item.elderProfile.realName || item.elderProfile.nickname || ('长辈#' + item.elderId)
}

function statusLabel(value: string): string {
  if (value === 'active') return '已绑定'
  if (value === 'disabled') return '已停用'
  return '未激活'
}

function statusTagType(value: string): 'success' | 'warning' | 'info' {
  if (value === 'active') return 'success'
  if (value === 'disabled') return 'warning'
  return 'info'
}

async function fetchBindings() {
  try {
    await loadData({
      search: search.value || undefined,
      status: status.value || undefined,
    })
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '家庭绑定数据加载失败')
  }
}

function handleInspect(item: FamilyBindingItem) {
  selected.value = item
  drawerVisible.value = true
}

watch([search, status], () => {
  page.value = 1
  fetchBindings()
})

onMounted(fetchBindings)
</script>

<template>
  <div>
    <div class="wb-page-header">
      <div>
        <span class="wb-page-title">家庭关系</span>
        <span class="wb-page-subtitle">梳理家属与长辈的绑定状态、健康档案覆盖情况，以及需要人工补齐的照护关系。</span>
      </div>
      <el-button :icon="Refresh" @click="fetchBindings">刷新关系</el-button>
    </div>

    <div class="wb-metric-grid">
      <div class="wb-metric-card">
        <span class="wb-card-label">绑定总数</span>
        <div class="wb-card-value">{{ total }}</div>
        <span class="wb-card-hint">当前查询范围内的关系数</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">已绑定</span>
        <div class="wb-card-value">{{ activeBindings }}</div>
        <span class="wb-card-hint">处于有效协同中的家庭关系</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">有健康档案</span>
        <div class="wb-card-value">{{ withArchive }}</div>
        <span class="wb-card-hint">已完成档案沉淀的长辈</span>
      </div>
      <div class="wb-metric-card">
        <span class="wb-card-label">实名信息完整</span>
        <div class="wb-card-value">{{ namedElders }}</div>
        <span class="wb-card-hint">适合继续推进服务连接</span>
      </div>
    </div>

    <div class="wb-filter-card" style="margin-bottom: 20px">
      <el-row :gutter="12" align="middle">
        <el-col :span="8">
          <el-input v-model="search" :prefix-icon="Search" placeholder="搜索长辈、家属、手机号或绑定 ID" clearable />
        </el-col>
        <el-col :span="5">
          <el-select v-model="status" placeholder="绑定状态" clearable style="width: 100%">
            <el-option label="已绑定" value="active" />
            <el-option label="未激活" value="inactive" />
            <el-option label="已停用" value="disabled" />
          </el-select>
        </el-col>
        <el-col :span="11" style="display: flex; justify-content: flex-end">
          <span class="wb-chip">先补齐无档案或状态异常的关系</span>
        </el-col>
      </el-row>
    </div>

    <div class="wb-panel">
      <div class="wb-page-header" style="margin-bottom: 14px">
        <div>
          <span class="wb-page-title" style="font-size: 22px">绑定明细</span>
          <span class="wb-page-subtitle">保留一张可核查的关系表，方便社区运营与客服联动。</span>
        </div>
      </div>
      <el-table :data="list" stripe v-loading="loading">
        <template #empty>
          <div style="padding: 28px; text-align: center; color: var(--wb-text-soft)">
            {{ loading ? '加载中...' : '暂无家庭绑定记录' }}
          </div>
        </template>
        <el-table-column prop="bindingId" label="绑定 ID" width="100" />
        <el-table-column label="长辈信息" min-width="180">
          <template #default="{ row }">
            <div>{{ elderName(row) }}</div>
            <div style="font-size: 12px; color: var(--wb-text-soft); margin-top: 4px">长辈 ID {{ row.elderId }} / {{ row.elderProfile.age ?? '-' }} 岁</div>
          </template>
        </el-table-column>
        <el-table-column prop="familyId" label="家属 ID" width="100" />
        <el-table-column label="健康档案" width="120">
          <template #default="{ row }">
            <el-tag :type="row.healthArchive.id ? 'success' : 'info'">{{ row.healthArchive.id ? '已建立' : '待建立' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="boundAt" label="绑定时间" width="180" />
        <el-table-column label="绑定状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleInspect(row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="display: flex; justify-content: flex-end; margin-top: 16px">
        <el-pagination
          v-model:current-page="page"
          layout="total, prev, pager, next"
          :total="total"
          :page-size="pageSize"
          @current-change="fetchBindings"
        />
      </div>
    </div>

    <el-drawer v-model="drawerVisible" title="家庭协同详情" size="460px">
      <template v-if="selected">
        <div class="wb-list">
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">长辈档案</span>
              <span class="wb-list-desc">{{ elderName(selected) }}，{{ selected.elderProfile.gender || '未填写性别' }}，{{ selected.elderProfile.age ?? '-' }} 岁。</span>
            </div>
            <el-tag :type="selected.healthArchive.id ? 'success' : 'warning'">{{ selected.healthArchive.id ? '档案已建' : '待补档案' }}</el-tag>
          </div>
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">家属协同</span>
              <span class="wb-list-desc">家属 ID {{ selected.familyId }}，绑定时间 {{ selected.boundAt }}。</span>
            </div>
          </div>
          <div class="wb-list-item">
            <div>
              <span class="wb-list-title">状态说明</span>
              <span class="wb-list-desc">当前关系为“{{ statusLabel(selected.status) }}”，可据此安排服务提醒与身份校验。</span>
            </div>
          </div>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

