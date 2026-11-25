# 任务调度指令 (DISPATCH.md)

## 任务元数据
- 角色：M3 产物体积与极值交互对抗挑战员 (teamwork_preview_challenger)
- 工作目录：/home/antigravity/MH-ai-ai/old/.agents/teamwork/challenger_m3
- 关联里程碑：Milestone 3 质量门禁 - 对抗挑战
- 权威输入原案：/home/antigravity/MH-ai-ai/old/.agents/teamwork/ORIGINAL_REQUEST.md
- 工程蓝图契约：/home/antigravity/MH-ai-ai/old/PROJECT.md
- 交付报告：
  - /home/antigravity/MH-ai-ai/old/.agents/teamwork/worker_m3_admin/handoff.md
  - /home/antigravity/MH-ai-ai/old/.agents/teamwork/worker_m3_volunteer/handoff.md

## 挑战目标与职责（对抗性实测）
1. **产物打包体积切片对抗核验**：
   - 编写压测脚本核验 `admin/dist/` 中各个切片大小，验证 vendor 包体是否已压降至安全区间（<500KB），确认 `chunk-echarts` 独立拆分且全量产物无异常膨胀；
2. **违规小字与旧冷色暴力扫描**：
   - 使用正则全盘暴力扫描 `admin/src/` 与 `volunteer/src/`：
     * 是否存在任何残留的 `cyber-theme`、`#020617`、`#00F3FF` 暗黑极客色；
     * 是否存在任何残留的 10px 违规小字；
3. **志愿者端交互与手势对抗实测**：
   - 验证底部抽屉 3 挡位（collapsed/default/expanded）在极端触控下滑/上滑时的边界处理；
   - 验证现场扫码取景器弹层在连击/快速关闭时的状态一致性；
4. **后端 4-Tier 79 E2E 测试全量回归**：
   - 执行 `backend/` 下 `npm run test:e2e`，验证 79/79 测试是否全部保持 100% PASS。
5. 在你的工作目录下输出 5-Component handoff.md 报告，明确给出对抗裁决结论：**APPROVE** 或 **CHALLENGE_FAILED**，并通过 send_message 汇报。
