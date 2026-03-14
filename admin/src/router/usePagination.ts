import { ref } from 'vue'

export function usePagination<T = any>(fetchFn: (params: any) => Promise<{ list?: T[], pagination?: { total: number } }>) {
  const page = ref(1)
  const pageSize = ref(10)
  const total = ref(0)
  const list = ref<T[]>([])
  const loading = ref(false)

  const loadData = async (extraParams: Record<string, any> = {}) => {
    loading.value = true
    try {
      const res = await fetchFn({ page: page.value, pageSize: pageSize.value, ...extraParams })
      list.value = res.list || []
      total.value = res.pagination?.total || 0
    } catch (err) {
      list.value = []
      total.value = 0
      throw err
    } finally {
      loading.value = false
    }
  }

  return { page, pageSize, total, list, loading, loadData }
}