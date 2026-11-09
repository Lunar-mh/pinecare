# 任务调度指令 (DISPATCH.md)

## 任务元数据
- 角色：M3 适老设计规范与生命周期内存审查员 (teamwork_preview_reviewer)
- 工作目录：/home/antigravity/MH-ai-ai/old/.agents/teamwork/reviewer_m3_2
- 关联里程碑：Milestone 3 质量门禁 - 独立审查 2
- 权威输入原案：/home/antigravity/MH-ai-ai/old/.agents/teamwork/ORIGINAL_REQUEST.md
- 工程蓝图契约：/home/antigravity/MH-ai-ai/old/PROJECT.md
- 技能规范指导：
  - /home/antigravity/MH-ai-ai/old/.agents/skills/vue3-composition-api/SKILL.md
  - /home/antigravity/MH-ai-ai/old/.agents/skills/frontend-design/SKILL.md
- 交付报告：
  - /home/antigravity/MH-ai-ai/old/.agents/teamwork/worker_m3_admin/handoff.md
  - /home/antigravity/MH-ai-ai/old/.agents/teamwork/worker_m3_volunteer/handoff.md

## 审查目标与职责
1. 审查适老化视觉与无障碍（A11y）：
   - 管理后台大屏：是否彻底摒弃暗黑极客风，落地暖玉微晶底色（#F8F6F0）与翡翠松青（#1F6B56）；字号是否消除 10px 违规小字；
   - 志愿者端：抽屉液态毛玻璃（backdrop-filter: blur(24px)）是否落地，接单/签到/签退是否统一为 60px 醒目大按钮，是否消除 10px~15px 小字；
2. 审查 ECharts 内存生命周期治理：
   - 检查 `analytics/index.vue` 与 `dashboard/index.vue` 是否彻底消除了重复 `echarts.init()` 无 dispose 的泄漏隐患；
   - 检查窗口尺寸调整时是否具备 `ResizeObserver` 响应；
3. 运行构建与回归自检：
   - 运行 `admin/` 下 `npm run build`
   - 运行 `volunteer/` 下 `npm run build`
   - 运行 `backend/` 下 `npm run test:e2e`
4. 在你的工作目录下输出 5-Component handoff.md 报告，明确给出审查结论：**APPROVE** 或 **REQUEST_CHANGES**，并通过 send_message 汇报。
