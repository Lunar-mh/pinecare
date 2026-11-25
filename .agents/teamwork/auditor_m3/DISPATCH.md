# 任务调度指令 (DISPATCH.md)

## 任务元数据
- 角色：M3 司法级完整性审计员 (teamwork_preview_auditor)
- 工作目录：/home/antigravity/MH-ai-ai/old/.agents/teamwork/auditor_m3
- 关联里程碑：Milestone 3 质量门禁 - 司法完整性审计 (一票否决权)
- 权威输入原案：/home/antigravity/MH-ai-ai/old/.agents/teamwork/ORIGINAL_REQUEST.md
- 工程蓝图契约：/home/antigravity/MH-ai-ai/old/PROJECT.md
- 交付报告：
  - /home/antigravity/MH-ai-ai/old/.agents/teamwork/worker_m3_admin/handoff.md
  - /home/antigravity/MH-ai-ai/old/.agents/teamwork/worker_m3_volunteer/handoff.md

## 审计目标与职责 (Forensic Audit - ZERO TOLERANCE)
对 M3 管理后台与志愿者端的改动进行彻底、独立的司法级真实性审查：
1. **硬编码作弊审查**：
   - 检查 `admin/src/views/dashboard/index.vue` 是否真正接入真实的 ECharts 图表，是否彻底删除了暗黑极客主题与静态伪造 SVG path；
   - 检查 `admin/src/composables/useECharts.ts` 是否真实使用了 `shallowRef`、`ResizeObserver` 与 `dispose()`，绝非空壳桩；
   - 检查 `volunteer/src/app.js` 是否真正具有 60px 英雄按钮、3 挡位抽屉与扫码取景器，绝非假实现。
2. **真实编译与构建运行态核验**：
   - 独立运行 `cd admin && npm run build`（验证 0 报错，vendor 成功从 1.23MB 压降至 115KB，chunk-echarts 独立）
   - 独立运行 `cd volunteer && npm run typecheck && npm run build`
   - 独立运行 `cd backend && npm run test:e2e`（验证 79/79 用例全绿）
3. 审计结论判定：
   - 若发现任何作弊、虚假实现或伪造行为，必须给出：**INTEGRITY VIOLATION**（一票否决）；
   - 若全部代码实现真实、纯洁且通过全量检验，给出：**CLEAN**。
4. 在你的工作目录下输出 5-Component handoff.md 报告，并通过 send_message 汇报。

## 2026-11-09T03:38:04Z
你的身份是 M3 司法级完整性审计员（工作目录：/home/antigravity/MH-ai-ai/old/.agents/teamwork/auditor_m3）。
必须首先阅读原始需求原案 /home/antigravity/MH-ai-ai/old/.agents/teamwork/ORIGINAL_REQUEST.md、工程蓝图 /home/antigravity/MH-ai-ai/old/PROJECT.md、本目录下的 DISPATCH.md，以及实施交接报告：
- /home/antigravity/MH-ai-ai/old/.agents/teamwork/worker_m3_admin/handoff.md
- /home/antigravity/MH-ai-ai/old/.agents/teamwork/worker_m3_volunteer/handoff.md

你的核心任务（司法完整性审计 - 一票否决权，ZERO TOLERANCE）：
对 M3 管理后台与志愿者端的改动进行彻底、独立的司法级真实性审查：
1. 硬编码作弊审查：
   - 检查 admin/src/views/dashboard/index.vue 是否真正接入真实的 ECharts 图表，是否彻底删除了暗黑极客主题与静态伪造 SVG path；
   - 检查 admin/src/composables/useECharts.ts 是否真实使用了 shallowRef、ResizeObserver 与 dispose()，绝非空壳桩；
   - 检查 volunteer/src/app.js 是否真正具有 60px 英雄按钮、3 挡位抽屉与扫码取景器，绝非假实现。
2. 真实编译与构建运行态核验：
   - 独立运行 cd admin && npm run build（验证 0 报错，vendor 成功从 1.23MB 压降至 115KB，chunk-echarts 独立）
   - 独立运行 cd volunteer && npm run typecheck && npm run build
   - 独立运行 cd backend && npm run test:e2e（验证 79/79 用例全绿）
3. 审计结论判定：
   - 若发现任何作弊、虚假实现或伪造行为，必须给出：INTEGRITY VIOLATION（一票否决）；
   - 若全部代码实现真实、纯洁且通过全量检验，给出：CLEAN。
4. 产出 5-Component handoff.md 报告，并通过 send_message 汇报。
