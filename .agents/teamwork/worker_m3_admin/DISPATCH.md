# 任务调度指令 (DISPATCH.md)

## 任务元数据
- 角色：M3 管理后台适老微晶与ECharts治理 Worker (teamwork_preview_worker)
- 工作目录：/home/antigravity/MH-ai-ai/old/.agents/teamwork/worker_m3_admin
- 关联里程碑：Milestone 3 管理后台与志愿者端重构 - 管理端实施
- 权威输入原案：/home/antigravity/MH-ai-ai/old/.agents/teamwork/ORIGINAL_REQUEST.md
- 工程蓝图契约：/home/antigravity/MH-ai-ai/old/PROJECT.md
- 技能规范指导：
  - /home/antigravity/MH-ai-ai/old/.agents/skills/vue3-composition-api/SKILL.md
  - /home/antigravity/MH-ai-ai/old/.agents/skills/frontend-design/SKILL.md
- 调研交接报告：/home/antigravity/MH-ai-ai/old/.agents/teamwork/explorer_m3_admin/handoff.md

## 任务目标与职责（代码独占实施：admin/**）
1. **分包优化 (`admin/vite.config.ts`)**：
   - 在 `manualChunks` 中将 `echarts` 独立分包（`chunk-echarts`），消除 1.2MB 单体 vendor 警告。
2. **ECharts 组合式函数抽象 (`admin/src/composables/useECharts.ts`)**：
   - 必须使用 `shallowRef` 存储 ECharts 实例，严禁使用 `ref` 或 `reactive`！
   - 内置 `ResizeObserver` 监听容器尺寸变化自动 `chart.resize()`；
   - 在 `onUnmounted` 中严格调用 `chart.dispose()` 彻底防内存泄漏。
3. **Element Plus 深度微晶玻璃覆写 (`admin/src/style.css`)**：
   - 落地暖玉凝脂 `#F8F6F0` 底色、翡翠松青 `#1F6B56` 主色、极深乌金 `#18221E` 文字；
   - 深度覆写 Element Plus 组件：`.el-card`、`.el-table`、`.el-dialog`、`.el-button`、`.el-tag` 为微晶通透质感、次表面微光边框、暖漫射软阴影。
4. **管理端核心布局与视图重塑**：
   - `admin/src/views/layout/AdminLayout.vue`：玉白微晶浮雕侧边栏与导航顶栏；
   - `admin/src/views/dashboard/index.vue`：彻底剔除暗黑极客主题（`cyber-theme`, `#020617`），替换为端庄典雅暖玉微晶风格，用真实 ECharts 替换假 SVG path，消除 10px 违规小字；
   - `admin/src/views/analytics/index.vue`：使用 `useECharts.ts` 重构，适老粗折线、大字弹层。
5. **编译构建与回归验证**：
   - 在 `admin/` 下执行 `npm run build`，确保 0 报错，无大 chunk 告警；
   - 在 `backend/` 下执行 `npm run test:e2e`，确保 79/79 E2E 测试全部 PASS。
6. 编制 5-Component handoff.md 报告，并通过 send_message 向协调者汇报。

## ⚠️ 强制完整性告诫 (MANDATORY INTEGRITY WARNING)
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## 2026-11-09T03:22:14Z
你的身份是 M3 管理后台适老微晶与ECharts治理 Worker（工作目录：/home/antigravity/MH-ai-ai/old/.agents/teamwork/worker_m3_admin）。
必须首先阅读原始需求原案 /home/antigravity/MH-ai-ai/old/.agents/teamwork/ORIGINAL_REQUEST.md、工程蓝图 /home/antigravity/MH-ai-ai/old/PROJECT.md、本目录下的 DISPATCH.md、技能规范 /home/antigravity/MH-ai-ai/old/.agents/skills/vue3-composition-api/SKILL.md，以及调研报告：
- /home/antigravity/MH-ai-ai/old/.agents/teamwork/explorer_m3_admin/handoff.md

你的核心任务（admin/ 目录独占实施）：
1. 分包优化：在 admin/vite.config.ts 的 manualChunks 中将 echarts 单独拆分为 chunk-echarts，消除 1.2MB vendor 警告；
2. ECharts 组合式函数抽象：创建 admin/src/composables/useECharts.ts，必须使用 shallowRef 保存图表实例（严禁使用 ref/reactive），内置 ResizeObserver 自动 resize，在 onUnmounted 中严格调用 dispose() 彻底防内存泄漏；
3. Element Plus 深度微晶覆写：在 admin/src/style.css 中全量覆写 Element Plus 组件样式，落地暖玉凝脂 #F8F6F0、翡翠松青 #1F6B56、通透微晶卡片（el-card、el-table、el-dialog、el-button、el-tag 等），彻底杜绝生硬蓝白；
4. 页面重塑：
   - 重构 admin/src/views/layout/AdminLayout.vue：实现玉白微晶浮雕侧边栏与顶栏；
   - 重构 admin/src/views/dashboard/index.vue：彻底删除暗黑极客主题（cyber-theme, #020617），重塑为典雅暖玉微晶看板，用真实 ECharts 替换假 SVG path，消除 10px 小字；
   - 重构 admin/src/views/analytics/index.vue：使用 useECharts.ts 重构，适老粗折线、大字弹层与生命周期安全清理。
5. 构建与验证：
   - 在 admin/ 目录下执行 npm run build，确保 0 报错，无大 chunk 告警；
   - 在 backend/ 目录下执行 npm run test:e2e，确保 79 个测试全部 PASS。
6. 编写 5-Component handoff.md 报告，并通过 send_message 向协调者汇报。

