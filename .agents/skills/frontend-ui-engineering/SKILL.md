---
name: frontend-ui-engineering
description: 生产级前端 UI 工程规范与工程化指导。涵盖组件组合架构、无障碍优先（A11y/WCAG AAA）、单向可预测状态流、四大弹性边界状态（加载/空态/错误/成功）、性能优化与弱网防御，确保代码达到一线大厂生产交付标准。
---

# 生产级前端 UI 工程规范 (Frontend UI Engineering)

本技能提供生产级（Production-Grade）前端工程架构、组件化模式与无障碍工程实践。目标是确保生成和重构的前端代码**健壮、可维护、类型完备、具备极佳的容错与无障碍访问能力**。

---

## 1. 核心工程原则 (Core Engineering Principles)

1. **无障碍优先 (A11y as a Baseline)**：
   - 适老化与无障碍不是外加的补丁，而是软件的基础工程要求。
   - 所有交互必须支持焦点导航、屏幕阅读器语义和高对比度环境。
2. **可预测状态流 (Predictable State Flow)**：
   - 状态应尽量保持在其使用的最近公共祖先，避免跨层级的隐式同步。
   - 优先通过纯函数**派生计算状态（Derived State）**，杜绝多个 `useEffect` / `watch` 导致的重复渲染与死循环。
3. **弹性状态边界 (Resilient Boundaries)**：
   - 任何组件必须同时考虑并处理 **四大生命周期状态**：
     - **Loading**：骨架屏或低干扰加载指示，避免布局跳跃（CLS = 0）。
     - **Empty**：有明确引导的空态（有插画/大图标 + 主动行动按钮），而非空白一片。
     - **Error**：非破坏性的局部错误兜底，支持“点击重试”，严禁全白屏。
     - **Success**：稳定展示数据，支持下拉刷新与增量更新。
4. **渐进增强与弱网防御 (Graceful Degradation)**：
   - 在高延迟或弱网环境下，保留核心主干交互（如离线缓存最近健康档案、SOS 优先走短彩信/电话硬件触发）。

---

## 2. 无障碍（A11y）与语义化规范

### 2.1 语义标签与角色
- 必须优先使用标准语义化标签：`<main>`、`<nav>`、`<header>`、`<footer>`、`<article>`、`<section>`。
- 严禁滥用 `div` 模拟按钮。如若在小程序受限组件中不得不使用容器组件模拟点击，必须显式附加：
  - `role="button"`
  - `aria-label="功能描述（如：确认服药）"`
  - `tabIndex={0}`

### 2.2 屏幕阅读器与实时动态更新（ARIA）
- **动态状态播报**：当发生异步事件（如血压测量完成、求助倒计时开始、收到远程留言）时，使用 `aria-live="polite"` 进行平缓通知；紧急报警使用 `aria-live="assertive"`：
  ```tsx
  <div role="status" aria-live="polite" className="sr-only">
    {isMeasuring ? '正在测量血压，请保持手臂静止' : `测量完成，高压 ${systolic}，低压 ${diastolic}`}
  </div>
  ```
- **纯装饰图标隐藏**：对于无需朗读的背景箭头、装饰图标，强制标记 `aria-hidden="true"`，防止屏幕朗读器念出一长串乱码。

### 2.3 物理触控热区与聚焦环
- 触控元素外层容器最小物理尺寸必须保证 **≥ 48px × 48px**。
- 支持键盘与无障碍辅助设备时，焦点态（Focus Ring）必须具备至少 **2px** 高对比度外轮廓（如 `outline: 2px solid #165DFF; outline-offset: 2px;`），严禁使用 `outline: none` 而不设替代样式。

---

## 3. 组件架构与组合模式 (Component Architecture)

### 3.1 复合组件优先（Composition over Configuration）
避免设计拥有数十个布尔参数（prop drilling）的“上帝组件”，推荐使用复合插槽/子组件模式：

```tsx
// ❌ 反面模式：参数爆炸的上帝组件
<ElderCard 
  title="今日用药" 
  hasBadge 
  badgeText="待服" 
  showButton 
  btnText="立即服用" 
  isUrgent={true} 
  onBtnClick={handleTake} 
/>

// ✅ 推荐模式：清晰组合与职责解耦
<ElderCard status="warning">
  <ElderCard.Header>
    <ElderCard.Title>今日用药</ElderCard.Title>
    <StatusBadge type="pending">待服 1 次</StatusBadge>
  </ElderCard.Header>
  <ElderCard.Content>
    <MedicationItem name="阿司匹林肠溶片" dose="100mg" time="08:00" />
  </ElderCard.Content>
  <ElderCard.Actions>
    <BigActionButton variant="primary" onClick={handleTake}>
      已确认服药
    </BigActionButton>
  </ElderCard.Actions>
</ElderCard>
```

### 3.2 目录与文件同地组织（Colocation）
组件所有相关文件集中在同一目录，禁止将单个组件的逻辑、样式与类型拆散在天涯海角：
```text
src/components/MedicationPlanCard/
├── index.tsx              # 组件对外导出主文件
├── MedicationPlanCard.tsx # 核心渲染逻辑
├── MedicationItem.tsx     # 子项纯组件
├── useMedicationCard.ts   # 专属状态与业务 Hook
├── types.ts               # 组件私有 Props 与类型定义
└── style.module.scss      # 组件局部样式
```

---

## 4. 状态收敛与数据流 (State Management)

1. **单一事实来源（Single Source of Truth）**：
   - 避免在组件内部用 `useState` 冗余存储由上层 props 计算即可得到的变量。
2. **异步请求防御模板**：
   ```typescript
   // 推荐：包含完整防御周期的请求封装
   interface RequestState<T> {
     data: T | null;
     isLoading: boolean;
     error: Error | null;
     isOffline: boolean;
   }
   ```
3. **避免竞态冲突（Race Condition Defense）**：
   在频繁切换 tab、搜索或翻页的场景下，必须使用取消令牌（AbortController）或时序标记丢弃过期的异步响应结果。

---

## 5. 性能与体积防御 (Performance by Default)

1. **防范布局抖动（Zero CLS）**：
   - 异步加载的图片、图表和地图容器必须预先通过 CSS 指定固定高宽或宽高比（`aspect-ratio`）。
2. **长列表虚拟化（Virtual Scrolling）**：
   - 报警流水日志、历史体征数据、定位轨迹点等长列表，超过 50 项必须启用虚拟滚动或分页按需加载，杜绝成千上万个 DOM 节点导致移动端或浏览器内存崩溃。
3. **依赖树剪枝（Tree-Shaking）**：
   - 严禁引入庞大的全量组件库，所有图标库与工具库（如 lodash-es）必须实行按需导入。

---

## 6. 前端工程交付自查表 (Engineering Checklist)

- [ ] **A11y**：所有可交互元素是否有标准 `aria-label`？可点击面积是否 ≥ 48px？
- [ ] **Contrast**：正文文字对比度是否达到 4.5:1，重要警报是否达到 7:1？
- [ ] **Fallback**：断网或接口报错时，是否展示了友好的错误提示与重试按钮？
- [ ] **Loading**：骨架屏是否有布局跳跃？
- [ ] **Memory**：计时器（setInterval）、原生事件监听（window/document）、ECharts 实例是否有在 unmount 时严密注销？
