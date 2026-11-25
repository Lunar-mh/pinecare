import { shallowRef, onMounted, onBeforeUnmount, type Ref } from 'vue'
import * as echarts from 'echarts'
import { registerWarmJadeTheme } from '@/design/echartsTheme'

/**
 * 现代 Vue 3 生产级 ECharts 组合式函数
 * 遵循 vue3-composition-api 规范：
 * 1. 严格使用 shallowRef 规避 Vue3 深度响应式 Proxy 劫持导致的性能断崖与递归拦截
 * 2. 内置 ResizeObserver 监听容器尺寸动态自适应图表 (chart.resize())
 * 3. 严格在 onBeforeUnmount 中断开监听并调用 chart.dispose()，彻底防内存泄漏
 * 4. 默认挂载暖玉微晶适老化主题 (warm-jade)
 */
export function useECharts(containerRef: Ref<HTMLElement | null>, defaultTheme: string = 'warm-jade') {
  // 必须使用 shallowRef，严禁使用 ref/reactive 包装第三方复杂实例！
  const chart = shallowRef<echarts.ECharts | null>(null)
  let resizeObserver: ResizeObserver | null = null

  const handleResize = () => {
    if (chart.value && !chart.value.isDisposed()) {
      chart.value.resize()
    }
  }

  type EChartsInitOpts = Parameters<typeof echarts.init>[2]

  const initChart = (theme: string = defaultTheme, initOpts?: EChartsInitOpts): echarts.ECharts | null => {
    if (!containerRef.value) return null

    // 防重复初始化内存泄漏：若已存在实例，先销毁
    if (chart.value) {
      if (!chart.value.isDisposed()) {
        chart.value.dispose()
      }
      chart.value = null
    }

    registerWarmJadeTheme()

    const instance = echarts.init(containerRef.value, theme, {
      renderer: 'canvas',
      ...initOpts,
    })
    chart.value = instance
    return instance
  }

  const setOption = (
    option: echarts.EChartsOption,
    notMerge?: boolean,
    lazyUpdate?: boolean
  ) => {
    if (!chart.value || chart.value.isDisposed()) {
      initChart()
    }
    chart.value?.setOption(option, notMerge, lazyUpdate)
  }

  const dispose = () => {
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    window.removeEventListener('resize', handleResize)
    if (chart.value) {
      if (!chart.value.isDisposed()) {
        chart.value.dispose()
      }
      chart.value = null
    }
  }

  onMounted(() => {
    if (containerRef.value) {
      // 监听容器自身宽高变动（包含侧边栏展开/折叠、窗口伸缩、流式布局）
      resizeObserver = new ResizeObserver(() => {
        handleResize()
      })
      resizeObserver.observe(containerRef.value)
    }
    window.addEventListener('resize', handleResize)
  })

  onBeforeUnmount(() => {
    dispose()
  })

  return {
    chart,
    initChart,
    setOption,
    resize: handleResize,
    dispose,
  }
}
