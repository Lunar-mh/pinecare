import { ref, type Ref } from 'vue'

/**
 * 通用分页 composable — 封装 page / pageSize / total / list 状态
 * fetcher 返回一个包含 list 数组的对象，total 可选（优先 total，其次 count）
 */
export function usePagination<T>(
  fetcher: (...args: any[]) => Promise<{ list: T[]; total?: number; count?: number }>,
  defaultPageSize = 20
) {
  const page = ref(1)
  const pageSize = ref(defaultPageSize)
  const total = ref(0)
  const list = ref<T[]>([]) as Ref<T[]>
  const loading = ref(false)

  async function loadData(extra: Record<string, unknown> = {}) {
    loading.value = true
    try {
      const result = await fetcher({
        page: page.value,
        pageSize: pageSize.value,
        ...extra,
      })
      list.value = result.list || []
      total.value = result.total ?? result.count ?? list.value.length
    } finally {
      loading.value = false
    }
  }

  return { page, pageSize, total, list, loading, loadData }
}
