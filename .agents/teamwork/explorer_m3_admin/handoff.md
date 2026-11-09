# M3 管理后台适老微晶与 ECharts 治理调研报告

**调研人**：M3 管理后台适老微晶与ECharts治理调研员 (explorer_m3_admin)  
**工作目录**：`/home/antigravity/MH-ai-ai/old/.agents/teamwork/explorer_m3_admin`  
**完成时间**：2026-11-09T03:22:00Z  
**任务性质**：只读全面调研与落地方案规划（严格遵循只读约束，严禁修改业务代码）

---

## 1. 调研观测 (Observation)

### 1.1 技术栈基线与构建现状
- **环境版本**（取自 `/home/antigravity/MH-ai-ai/old/admin/package.json`）：
  - Vue: `^3.5.25`
  - Vite: `^7.3.1`
  - Element Plus: `^2.13.5`
  - @element-plus/icons-vue: `^2.3.2`
  - ECharts: `^6.0.0`
  - vue-router: `^4.6.4`
  - TypeScript: `~5.9.3` / vue-tsc: `^3.1.5`
- **构建健康度验证**：
  - 执行命令：`cd /home/antigravity/MH-ai-ai/old/admin && npm run build` (`vue-tsc -b && vite build`)
  - 验证结果：**成功（Exit Code 0，耗时 11.89s，0 类型报错，0 语法警告）**。
  - 构建产物警报：
    `dist/assets/vendor-CRoiN5bo.js: 1,235.79 kB │ gzip: 412.25 kB`
    Vite 触发警告：`Some chunks are larger than 1000 kB after minification.`
    **根因定位**：`admin/vite.config.ts` 的 `rollupOptions.output.manualChunks` 拆分了 `element-plus`、`vue-router`、`vue-core`，但**未对 `echarts` 做独立拆包**，导致大体积的 ECharts 全量打入 `vendor` 包。

---

### 1.2 页面架构与视图排查

#### ① 大屏看板违规排查（`admin/src/views/dashboard/index.vue`）
- **严重风格违背**：
  - 引用代码：`class="yao-dashboard cyber-theme"`（第 134 行）
  - 样式定义（第 354-365 行）：
    ```css
    .cyber-theme {
      --glow-blue: #00F3FF;
      --glow-red: #FF4D4F;
      --glow-gold: #F09236;
      --bg-deep: #020617;
      background: var(--bg-deep);
      color: #E2E8F0;
    }
    ```
  - 严重违反原始需求 `ORIGINAL_REQUEST.md` 第 5 行：*“我想要的风格是液态玻璃质感，不要暗黑极客风格，要的就是端庄典雅，沉稳大气，毕竟是给中老年人使用的所以一定要符合长辈的口味”*，以及 `PROJECT.md` §1.2：*“彻底摒弃暗黑极客风格与生硬纯白”*。
  - 页面字号严重违规：大量出现 `font-size: 10px; color: #64748B`（第 387、428 行），违反适老硬约束（正文字号 ≥16px~20px，严禁 10px~13px）。
  - **图表造假**：第 220-240 行使用原生静态 SVG `<path d="M0,100 Q50,80 100,120 ...">` 模拟趋势波形，**完全未使用 ECharts**，数据不可交互、无法反映真实运营指标。

#### ② 趋势分析图表与生命周期排查（`admin/src/views/analytics/index.vue`）
- **ECharts 内存泄漏与响应式违规**：
  - 引用代码（第 61-86 行）：
    ```typescript
    function renderCharts() {
      if (pieChartRef.value) {
        const pieChart = echarts.init(pieChartRef.value)
        pieChart.setOption({ ... })
      }
      if (barChartRef.value) {
        const barChart = echarts.init(barChartRef.value)
        barChart.setOption({ ... })
      }
    }
    ```
  - **未按规范使用 `shallowRef`**：图表实例仅为函数内部局部变量，无持久响应式引用。
  - **刷新重绘内存泄漏**：第 95 行 `fetchAnalyticsData()` 每次重新拉取数据都会调用 `renderCharts()`，在已有图表 DOM 上重复调用 `echarts.init()`，未先调用 `.dispose()`，导致旧图表 Canvas、定时器与事件监听无法释放，发生直接内存泄漏。
  - **组件卸载无清理**：完全没有 `onBeforeUnmount` 或 `onUnmounted` 钩子，路由切换离开 `/analytics` 后图表实例持续滞留内存。
  - **缺乏响应式自适应**：未监听窗口大小改变或侧边栏展开/收起，无 `ResizeObserver`，侧边栏切换时图表容器产生形变错位。
  - **适老化欠缺**：柱状图使用原生生硬纯蓝 `#409EFF`，字体为原生 12px 小字，Tooltip 弹层未做适老化大字与高对比度微晶适配。

#### ③ 基础布局现状（`admin/src/views/layout/AdminLayout.vue`）
- 具备基础的侧边栏与顶栏结构，使用了简单的 `backdrop-filter: blur(12px)` 与浅白底色。
- **缺乏“玉白微晶浮雕”质感**：
  - 边框仍为生硬的单层线条 `border-right: 1px solid rgba(227, 216, 200, 0.9)`，缺乏次表面微光边框与顶部微高光反光。
  - 品牌图标与激活状态采用深绿硬渐变，缺少暖玉通透润白与浮雕阴影层次。
  - 待办通知气泡计数（第 88 行 `待处理 3`）为硬编码固定数字，未联动后端真实未处理 SOS/告警统计。

#### ④ Element Plus 全局样式现状（`admin/src/style.css`）
- 仅声明了基础的 CSS 自定义变量 `--wb-bg: #f5efe6; --wb-surface: #fffdfa; --wb-primary: #2f6c5b;` 等以及私有类名（`.wb-panel`, `.wb-metric-card` 等）。
- **零 Element Plus 组件覆写**：
  - `.el-card`、`.el-table`、`.el-dialog`、`.el-drawer`、`.el-button`、`.el-input`、`.el-pagination`、`.el-tag` 均使用 Element Plus 默认官方主题（高亮纯蓝、生硬纯白底、直角/小圆角、生硬投影）。
  - 与 `PROJECT.md` §1.2 要求的“通透润白微晶玻璃、次表面微光边框、暖漫射软阴影、翡翠松青主色”存在系统级差距。

#### ⑤ 组合式函数与公共组件目录排查
- `admin/src/composables/` 目前仅有 `usePagination.ts` 1 个文件，**缺少 `useECharts.ts`**（规范见 `vue3-composition-api` SKILL 第 83-125 行）。
- `admin/src/components/` **目录当前为空或不存在**，未沉淀任何适老微晶图表或卡片组件。

---

## 2. 逻辑推导链 (Logic Chain)

```
[Observation 1.1] npm run build 顺利通过，但 vendor 打包达 1.23MB
    │
    ▼ (推导 1)
构建链完整可用，无破坏性类型缺陷。将 echarts 从 vendor 独立分包即可彻底消除包体积警告。

[Observation 1.2.①] dashboard/index.vue 采用纯暗黑极客主题 (#020617, 10px 小字, SVG fake chart)
    │
    ▼ (推导 2)
直接违背 ORIGINAL_REQUEST.md 与 PROJECT.md §1.2 的适老化温润原案，且与浅色系 AdminLayout 割裂。
必须彻底重塑为暖玉微晶温润白底看板，去除极客暗黑类名，用真正的 ECharts 适老趋势图替换静态假 SVG。

[Observation 1.2.② & ⑤] analytics/index.vue 缺乏 shallowRef 与 dispose，无 ResizeObserver，缺 useECharts
    │
    ▼ (推导 3)
违反 vue3-composition-api 生产规范，在频繁刷新与路由切换中必然引发内存泄漏。
必须按照 SKILL 规范封装 useECharts.ts，并在图表组件中实现 shallowRef 托管与 unmounted 自动销毁。

[Observation 1.2.④] style.css 零 Element Plus 覆写，全系统组件呈现原生默认蓝白风格
    │
    ▼ (推导 4)
实现“管理中台 Element Plus 玻璃化”的最高效途径，是在 style.css 中通过 CSS Variables 与全局选择器
对 el-card, el-table, el-dialog, el-drawer, el-button, el-pagination 进行微晶玻璃材质覆写，
既保证全域统一，又无需修改每一个页面的模板结构。
```

---

## 3. 局限与前提假设 (Caveats)

1. **接口降级容灾假设**：
   管理后台 `services/dashboard.ts` 内置了 `devFallbackStats()` 与 `devFallbackOverviewStats()`。在后端真实接口离线或测试数据库未初始化时，前端仍可正常降级渲染，图表不会崩溃。
2. **只读约束说明**：
   本调研员严格执行“只读”铁律，未对 `admin/` 业务代码执行任何写入操作。后附代码落地方案均为直接可执行的代码级草案（Code Blueprints），供后续实施人员直接采用。
3. **低端设备与 GPU 渲染边界**：
   多层 `backdrop-filter: blur(20px)` 会消耗一定 GPU 资源。在桌面端管理中台完全流畅，但需在样式中提供 `background: rgba(255, 253, 250, 0.95)` 的 fallback，确保在不支持微晶滤镜的旧浏览器上依然温和可读。

---

## 4. 调研结论与落地实施方案 (Conclusion)

### 4.1 实施改造文件清单 (File Mutation Plan)

| 操作 | 文件路径 | 改造目的与职责 |
|---|---|---|
| **修改** | `admin/vite.config.ts` | 配置 `manualChunks` 独立拆分 `echarts`，解决 1.2MB 包体积警报 |
| **新增** | `admin/src/composables/useECharts.ts` | 封装企业级 ECharts 组合式函数（`shallowRef`、`dispose`、`ResizeObserver`） |
| **新增** | `admin/src/design/echartsTheme.ts` | 定义暖玉微晶 ECharts 适老主题（翡翠绿、暖栗琥珀、4px 粗折线、16px 大字 Tooltip） |
| **修改** | `admin/src/style.css` | 深度覆写 Element Plus 微晶玻璃体系（变量、卡片、表头、弹窗、抽屉、按钮、分页） |
| **修改** | `admin/src/views/layout/AdminLayout.vue` | 重塑“玉白微晶浮雕导航”，升级翡翠徽标、微晶浮雕菜单项与动态待办角标 |
| **修改** | `admin/src/views/dashboard/index.vue` | 彻底拔除暗黑极客主题（cyber-theme），重构为温润暖玉微晶全景看板，接入真实 ECharts 24h 告警趋势图 |
| **修改** | `admin/src/views/analytics/index.vue` | 接入 `useECharts`，消除内存泄漏，图表升级为适老粗线条与微晶大字风格 |

---

### 4.2 核心代码落地方案与设计规范 (Code Implementation Blueprints)

#### 方案 1：Vite 拆包优化 (`admin/vite.config.ts`)
在 `manualChunks` 中增加 `echarts` 独立切片：
```typescript
manualChunks(id) {
  if (id.includes('node_modules')) {
    if (id.includes('echarts')) return 'echarts' // ✅ 独立分包，体积从 vendor 剥离
    if (id.includes('element-plus')) return 'element-plus'
    if (id.includes('@element-plus/icons-vue')) return 'element-plus-icons'
    if (id.includes('vue-router')) return 'vue-router'
    if (id.includes('vue')) return 'vue-core'
    return 'vendor'
  }
  return undefined
}
```

#### 方案 2：ECharts 适老主题与生命周期治理 (`useECharts.ts` & `echartsTheme.ts`)
新建 `admin/src/composables/useECharts.ts`：
```typescript
import { shallowRef, onMounted, onBeforeUnmount, type Ref } from 'vue'
import * as echarts from 'echarts'
import { registerWarmJadeTheme } from '@/design/echartsTheme'

export function useECharts(containerRef: Ref<HTMLElement | null>) {
  // 1. 严格使用 shallowRef 规避 Vue3 深度响应式 Proxy 劫持导致的性能断崖
  const chart = shallowRef<echarts.ECharts | null>(null)
  let resizeObserver: ResizeObserver | null = null

  const initChart = (theme: string = 'warm-jade') => {
    if (!containerRef.value) return null
    if (chart.value) {
      chart.value.dispose() // 2. 防重复初始化内存泄漏
    }
    registerWarmJadeTheme()
    const instance = echarts.init(containerRef.value, theme, { renderer: 'canvas' })
    chart.value = instance
    return instance
  }

  const handleResize = () => {
    chart.value?.resize()
  }

  onMounted(() => {
    if (containerRef.value) {
      // 3. 响应侧边栏折叠与视口变动
      resizeObserver = new ResizeObserver(() => handleResize())
      resizeObserver.observe(containerRef.value)
    }
  })

  onBeforeUnmount(() => {
    // 4. 组件销毁前彻底注销监听与 Canvas 内存
    resizeObserver?.disconnect()
    chart.value?.dispose()
    chart.value = null
  })

  return { chart, initChart, resize: handleResize }
}
```

新建 `admin/src/design/echartsTheme.ts`：
```typescript
import * as echarts from 'echarts'

let registered = false
export function registerWarmJadeTheme() {
  if (registered) return
  echarts.registerTheme('warm-jade', {
    color: ['#1F6B56', '#C86D3B', '#D33833', '#4F8D66', '#4A7594'],
    backgroundColor: 'transparent',
    textStyle: {
      color: '#18221E',
      fontSize: 14,
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif'
    },
    line: {
      itemStyle: { borderWidth: 2 },
      lineStyle: { width: 3.5 }, // ✅ 适老粗折线
      symbolSize: 8,
      smooth: true
    },
    tooltip: {
      backgroundColor: 'rgba(255, 253, 250, 0.95)',
      borderColor: 'rgba(31, 107, 86, 0.25)',
      borderWidth: 1,
      textStyle: { color: '#18221E', fontSize: 16 }, // ✅ 适老大字弹窗
      extraCssText: 'box-shadow: 0 12px 32px rgba(31, 55, 45, 0.12); border-radius: 12px; backdrop-filter: blur(8px);'
    }
  })
  registered = true
}
```

#### 方案 3：Element Plus 深度微晶玻璃覆写 (`admin/src/style.css`)
扩展 `style.css`，注入全局液态玻璃核心公式与 Element Plus 组件微晶穿透覆写：
```css
:root {
  /* 暖玉微晶设计令牌体系 */
  --wb-bg: #F8F6F0;                  /* 暖玉凝脂底色 */
  --wb-surface: rgba(255, 255, 255, 0.82); /* 微晶玻璃表面 */
  --wb-primary: #1F6B56;             /* 翡翠松青 */
  --wb-primary-light: #438470;
  --wb-secondary: #C86D3B;           /* 暖栗琥珀 */
  --wb-danger: #D33833;              /* 朱砂朱雀 */
  --wb-text: #18221E;                /* 极深乌金 */
  --wb-text-soft: #485750;           /* 沉香黛灰 */
  --wb-border: rgba(255, 255, 255, 0.85);
  --wb-border-sub: rgba(210, 225, 218, 0.6);
  --wb-glass-shadow: inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.95),
                     0 4px 14px -2px rgba(31, 55, 45, 0.05),
                     0 16px 36px -4px rgba(31, 55, 45, 0.08);

  /* Element Plus 品牌主色映射 */
  --el-color-primary: #1F6B56;
  --el-color-primary-light-3: #438470;
  --el-color-primary-light-9: #EAF3EF;
  --el-color-success: #1F6B56;
  --el-color-warning: #C86D3B;
  --el-color-danger: #D33833;
  --el-text-color-primary: #18221E;
  --el-text-color-regular: #485750;
  --el-font-size-base: 15px;
}

/* 1. 卡片与面板微晶玻璃化 */
.wb-panel,
.wb-metric-card,
.wb-filter-card,
.el-card {
  background: var(--wb-surface) !important;
  backdrop-filter: blur(20px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
  border: 1px solid var(--wb-border) !important;
  border-bottom: 1px solid var(--wb-border-sub) !important;
  box-shadow: var(--wb-glass-shadow) !important;
  border-radius: 20px !important;
}

/* 2. 表格与表头温润微晶覆写 */
.el-table {
  background: transparent !important;
  --el-table-header-bg-color: rgba(248, 246, 240, 0.85) !important;
  --el-table-tr-bg-color: transparent !important;
  --el-table-row-hover-bg-color: rgba(31, 107, 86, 0.05) !important;
  font-size: 15px !important;
}
.el-table th.el-table__cell {
  background: rgba(248, 246, 240, 0.85) !important;
  color: var(--wb-text) !important;
  font-weight: 700 !important;
  border-bottom: 1px solid rgba(227, 216, 200, 0.8) !important;
}
.el-table td.el-table__cell {
  border-bottom: 1px solid rgba(227, 216, 200, 0.5) !important;
}

/* 3. 弹窗与抽屉微晶覆写 */
.el-dialog,
.el-drawer {
  background: rgba(255, 253, 250, 0.95) !important;
  backdrop-filter: blur(24px) saturate(180%) !important;
  border: 1px solid rgba(255, 255, 255, 0.9) !important;
  box-shadow: var(--wb-glass-shadow), 0 24px 48px rgba(31, 55, 45, 0.15) !important;
  border-radius: 24px !important;
}
.el-overlay {
  backdrop-filter: blur(8px) !important;
  background-color: rgba(24, 34, 30, 0.35) !important;
}

/* 4. 按钮与操作态适老放大与微晶触控 */
.el-button--primary {
  background: linear-gradient(135deg, #1F6B56, #2E8B6E) !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(31, 107, 86, 0.25) !important;
  border-radius: 12px !important;
  font-weight: 600 !important;
  transition: all 0.2s ease !important;
}
.el-button--primary:active {
  transform: translateY(1.5px) scale(0.98) !important;
}
```

#### 方案 4：AdminLayout 浮雕导航重塑 (`AdminLayout.vue`)
- 侧边栏背景采用：`background: rgba(255, 253, 250, 0.85); backdrop-filter: blur(20px); border-right: 1px solid rgba(210, 225, 218, 0.6); box-shadow: 4px 0 24px rgba(31, 55, 45, 0.04);`
- 品牌徽标升级：玉质微晶渐变结合次表面内高光，主品牌色锁定为 `#1F6B56`。
- 导航选中态（`aside-link--active`）：
  `background: rgba(31, 107, 86, 0.08); border: 1px solid rgba(31, 107, 86, 0.15); box-shadow: inset 0 1px 2px rgba(255,255,255,0.8);`，带来温润浮雕立体感。

#### 方案 5：大屏看板去暗黑化与 ECharts 真实联动 (`dashboard/index.vue`)
- **彻底去除 `.cyber-theme`**，采用与 AdminLayout 一致的暖玉凝脂背景体系。
- 移除极客小字（10px），标题统一为 22~28px 沉稳大字，指标数字放大为 36~44px，辅文字提升至 15px，对比度严格达到 WCAG AAA。
- **废弃 fake SVG `.trend-mock-chart`**，引入 `<div ref="trendChartRef" style="height: 240px"></div>`，通过 `useECharts` 绑定真实 24 小时告警趋势曲线，配置翡翠绿区域渐变填充与 3.5px 粗折线。

---

## 5. 独立复核验证方法 (Verification Method)

后续实施人员与审计员可通过以下标准命令与路径进行验证：

1. **类型检查与前端编译**：
   ```bash
   cd /home/antigravity/MH-ai-ai/old/admin
   npm run build
   ```
   **合格标准**：`vue-tsc` 0 报错，Vite 构建成功，且 `vendor` 切片大小应由当前的 1.23MB 大幅下降，消除大体积告警。

2. **内存泄露与图表生命周期核验**：
   - 检查 `admin/src/composables/useECharts.ts` 是否存在并导出 `useECharts`。
   - 检查 `admin/src/views/analytics/index.vue` 与 `dashboard/index.vue`：
     - 是否移除了直接的局部 `echarts.init()`；
     - 是否使用了 `shallowRef`；
     - 切换路由或调用刷新时，是否自动触发 `dispose()`。

3. **视觉设计合规检查**：
   - 启动本地预览：`npm run preview` 或 `npm run dev`；
   - 访问 `http://localhost:5173/#/dashboard`：
     - 确认背景是否为温润暖玉凝脂色系（`#F8F6F0`），暗黑极客主题已彻底消失；
     - 确认 24h 告警趋势图为真实 ECharts 平滑折线图，悬浮具备适老微晶大字 Tooltip；
   - 访问各子页面（如用户管理、SOS）：
     - 确认表格、表头、卡片与弹窗已完全覆写为通透微晶玻璃质感。

---
*调研报告归档完毕，等待后续实施指令。*
