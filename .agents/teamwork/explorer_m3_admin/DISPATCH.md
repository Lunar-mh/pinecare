## 2026-11-09T03:14:02Z

你的身份是 M3 管理后台适老微晶与ECharts治理调研员（工作目录：/home/antigravity/MH-ai-ai/old/.agents/teamwork/explorer_m3_admin）。
必须首先阅读原始需求原案 /home/antigravity/MH-ai-ai/old/.agents/teamwork/ORIGINAL_REQUEST.md、工程蓝图 /home/antigravity/MH-ai-ai/old/PROJECT.md、本目录下的 DISPATCH.md，以及技能规范 /home/antigravity/MH-ai-ai/old/.agents/skills/vue3-composition-api/SKILL.md。

你的核心任务（只读调研，严禁修改业务代码）：
1. 深入调研 admin/ 目录结构、配置、依赖、页面视图与组件：
   - 检查 Vue 3 + Vite + Element Plus 版本与现状；
   - 检查 AdminLayout、大屏看板、工单流转、长辈管理等核心页面；
   - 检查 ECharts 图表引用方式（重点排查是否使用了 shallowRef，是否在 onUnmounted 中执行了 dispose() 内存防泄漏）。
2. 对照 PROJECT.md §1.2 与 §2.1 特性 #15、#16：
   - 规划 Element Plus 深度微晶玻璃覆写方案（卡片、表头、弹窗、侧边栏导航）；
   - 规划 ECharts 适老化图表升级（适老粗折线、大字弹层、shallowRef 规范接入与内存生命周期治理）；
   - 测试管理后台构建命令（如 npm run build）。
3. 产出 5-Component handoff.md 报告，给出具体修改文件清单与代码落地方案，并通过 send_message 汇报。
