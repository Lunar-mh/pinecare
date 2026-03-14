import { ref, type Ref } from 'vue'

type PaginationPayload = {
  total?: number
  count?: number
  pagination?: {
    total?: number
    count?: number
    page?: number
    page_size?: number
    pageSize?: number
  }
}

type PaginationResponse<T> = PaginationPayload & {
  list?: T[]
}

export function usePagination<T>(
  fetcher: (params: Record<string, unknown>) => Promise<PaginationResponse<T>>,
  defaultPageSize = 10
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
      total.value = Number(
        result.total ??
          result.count ??
          result.pagination?.total ??
          result.pagination?.count ??
          list.value.length
      )
    } finally {
      loading.value = false
    }
  }

  return { page, pageSize, total, list, loading, loadData }
}
