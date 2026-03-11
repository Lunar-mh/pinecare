# 银伴四端协同开发治理文档组

本目录用于约束“老人端小程序、家属端小程序、社区管理后台、志愿者端、共享后端”的统一开发方向。

适用对象：

1. 后续参与开发的 AI Agent
2. 人工开发者与产品设计者
3. 用于答辩、分工、审查与防跑偏的项目负责人

使用顺序：

1. 先读 `01-master-governance.md`
2. 再读目标端蓝图文档
3. 如涉及接口、权限、实体或状态，必须继续读：
   `06-shared-backend-blueprint.md`
   `07-data-dictionary-and-permission-matrix.md`
4. 做联调、验收、录屏、答辩时必须读：
   `08-cross-end-acceptance-matrix.md`
   `09-anti-drift-checklist.md`

目录说明：

1. `01-master-governance.md`：总规主文档，最高约束文件
2. `02-elder-miniapp-blueprint.md`：老人端蓝图
3. `03-family-miniapp-blueprint.md`：家属端蓝图
4. `04-admin-console-blueprint.md`：社区管理后台蓝图
5. `05-volunteer-workbench-blueprint.md`：志愿者端蓝图
6. `06-shared-backend-blueprint.md`：共享后端蓝图
7. `07-data-dictionary-and-permission-matrix.md`：数据字典、状态字典、权限矩阵
8. `08-cross-end-acceptance-matrix.md`：跨端主链路验收矩阵
9. `09-anti-drift-checklist.md`：防跑偏清单
10. `10-delivery-roadmap-and-task-breakdown.md`：按端、按链路、按阶段的开发任务拆解
11. `11-ai-execution-playbook.md`：后续 AI 执行工作流与交付标准
12. `12-executable-issue-backlog.md`：按老人端、家属端、后台、志愿者端、后端拆开的可执行 issue 清单

统一规则：

1. 竞赛阶段只围绕五条主链路开发，不平均铺满全部 15 个模块。
2. 不允许把设计稿、规格稿、stub 能力表述成真实大规模落地事实。
3. 不允许新增自由角色、自由状态或无主链路归属的新模块。
4. 新增功能前，必须先明确服务对象、所属端、依赖实体、接口范围和验收链路。
