---
name: vue3-composition-api
description: 现代 Vue 3 与 TypeScript 生产级开发规范。专为大型管理中台与可视化大屏量身定制，涵盖 Composition API 最佳实践、响应式陷阱规避、Composables 抽象、Element Plus 深度封装、ECharts 内存安全与事件复盘流集成。
---

# Vue 3 现代组合式 API 开发规范 (Vue 3 Composition API)

本技能为 Vue 3 + Vite + TypeScript 现代管理中台（如银伴管理后台 `admin/`）提供架构设计、代码风格与高可靠工程准则。杜绝 Options API 混用、响应式丢失、组件内存泄露与松散的 TypeScript 类型。

---

## 1. 响应式核心准则 (Reactivity Guidelines)

### 1.1 `ref` vs `reactive` 的选用标准
- **一律优先使用 `ref()`**：
  - `ref()` 适用于基础类型（字符串、数字、布尔）及普通对象/数组。在 `<script setup>` 中通过 `.value` 访问，在模板中自动解包，心智模型统一。
- **解构陷阱规避**：
  - 严禁对 `reactive()` 对象直接进行 ES6 解构，否则将立刻丧失响应式。如需解构，必须使用 `toRefs()` 或 `toRef()`：
  ```typescript
  // ❌ 错误：解构导致响应式断裂
  const state = reactive({ filterStatus: 'ALL', page: 1 });
  const { filterStatus } = state; 

  // ✅ 正确：保持响应式引用
  const state = reactive({ filterStatus: 'ALL', page: 1 });
  const { filterStatus } = toRefs(state);
  ```
- **复杂外部实例使用 `shallowRef`**：
  - 对于 ECharts 实例、富文本编辑器、高德/腾讯地图 Map 实例等大型外部第三方对象，**严禁使用深度响应式 `ref()` 或 `reactive()`**，否则 Vue 会对底层海量属性进行 Proxy 拦截代理，导致严重性能断崖甚至栈溢出。强制使用 `shallowRef()` 或 `markRaw()`：
  ```typescript
  import { shallowRef, onMounted, onBeforeUnmount } from 'vue';
  import * as echarts from 'echarts';

  const chartContainer = ref<HTMLDivElement | null>(null);
  const chartInstance = shallowRef<echarts.ECharts | null>(null); // ✅ 浅层响应式
  ```

---

## 2. 脚本规范与 `<script setup>` 标准

所有单文件组件必须统一采用 `<script setup lang="ts">`：

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { SosAlertRecord } from '@/services/types';

// 1. Props 显式类型声明（纯类型模式）
interface Props {
  alertId: string;
  refreshInterval?: number;
}
const props = withDefaults(defineProps<Props>(), {
  refreshInterval: 5000,
});

// 2. Emits 严格类型声明
interface Emits {
  (e: 'resolved', id: string, timestamp: number): void;
  (e: 'escalate', id: string, reason: string): void;
}
const emit = defineEmits<Emits>();

// 3. 内部响应式状态
const isProcessing = ref(false);

// 4. 计算属性（纯计算，禁止副作用）
const hasAutoRefresh = computed(() => props.refreshInterval > 0);
</script>
```

---

## 3. Composables 组合式逻辑抽离规范

所有跨组件共享的业务逻辑与状态，遵循 `useXxx` 组合式函数规范。

### 3.1 必须遵循的生命周期边界
- 组合式函数内必须自包含**副作用清理**，防止页面切换后定时器、WebSocket 或 DOM 监听持续在后台运行。

### 3.2 典型规范模板：ECharts 自适应与防内存泄露
```typescript
// src/composables/useECharts.ts
import { shallowRef, onMounted, onBeforeUnmount, type Ref } from 'vue';
import * as echarts from 'echarts';

export function useECharts(containerRef: Ref<HTMLElement | null>) {
  const chart = shallowRef<echarts.ECharts | null>(null);
  let resizeObserver: ResizeObserver | null = null;

  const initChart = (theme: string = 'light') => {
    if (!containerRef.value) return null;
    if (chart.value) {
      chart.value.dispose();
    }
    const instance = echarts.init(containerRef.value, theme);
    chart.value = instance;
    return instance;
  };

  const handleResize = () => {
    chart.value?.resize();
  };

  onMounted(() => {
    if (containerRef.value) {
      resizeObserver = new ResizeObserver(() => handleResize());
      resizeObserver.observe(containerRef.value);
    }
  });

  onBeforeUnmount(() => {
    // 强制清理，避免内存泄露
    resizeObserver?.disconnect();
    chart.value?.dispose();
    chart.value = null;
  });

  return {
    chart,
    initChart,
    resize: handleResize,
  };
}
```

---

## 4. Element Plus 企业中台规范

1. **Table 表格与动态高度**：
   - 包含操作栏和分页器的管理表格，必须设置 `v-loading` 加载状态。
   - 避免固定死每列宽度（px），优先采用 `min-width` 并开启 `show-overflow-tooltip`。
2. **Dialog 对话框内存与重置**：
   - 弹窗必须开启 `destroy-on-close`，确保每次打开都获取纯净的 DOM 与表单状态。
   - 对话框的“确定”按钮必须包含 `loading` 属性绑定，防止管理员双击重复提交接口。
3. **Form 表单校验与重置**：
   - 表单模型需明确指定 TypeScript 接口类型。
   - 打开编辑弹窗前，调用 `formRef.value?.resetFields()` 清空校验残留。

---

## 5. 事件复盘与统一证据链展示规范 (Event Replay & Evidence)

银伴后台核心特色在于**突发事件时间线复盘与证据展示**（`event-replay` / `evidence` 模块）。
- **时间轴组件设计**：使用 `el-timeline` 结合动态状态标签（`el-tag`）。
- **报警级别色彩映射**：
  - 致命/紧急（SOS、严重跌倒）：`danger`（朱红）
  - 关注/预警（围栏越界、离线超时）：`warning`（橙色）
  - 恢复/正常：`success`（绿色）
- **长连接与轮询回退**：对报警中心必须实现 SSE/WebSocket 监听，断开后自动平滑降级为 5 秒心跳轮询，并在界面顶部显示“网络重连中”警示条。

---

## 6. Vue 3 自查审查清单 (Review Checklist)

- [ ] 是否在 `<script setup>` 中杜绝了任何未声明类型的 `any`？
- [ ] 复杂的外部实例（如 ECharts）是否使用了 `shallowRef` 而非 `ref`？
- [ ] 是否清理了组件销毁时的所有定时器、DOM 监听与 WebSocket 句柄？
- [ ] 是否避免了在 `computed` 中执行异步请求或修改其他状态？
- [ ] 表单提交时是否对按钮做了防重复点击（loading 防抖）？
