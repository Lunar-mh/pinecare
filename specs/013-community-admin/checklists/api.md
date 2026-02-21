# API 需求质量 检查清单: 社区管理端 (013-community-admin)

**目的**: 评估社区管理端后端 API 需求文本质量（完整/清晰/一致/可度量/覆盖），不检查实现。
**创建日期**: 2026-02-20
**关联文档**: `D:\03_Study\Desktop\old\specs\013-community-admin\plan.md`

## 需求完整性

- [ ] CHK001 是否明确管理端能力清单（志愿者、工单、活动、统计）？ [完整性, Plan: Summary]
- [ ] CHK002 是否明确角色模型与权限边界（admin/leader/volunteer 哪些端点可访问）？ [Gap, Data Model: CommunityAdmin]
- [ ] CHK003 是否明确工单字段约束与状态机转移规则？ [Gap, Data Model: ServiceOrder; Contracts: /admin/orders]
- [ ] CHK004 是否明确统计指标口径与数据来源依赖？ [Gap, Contracts: /admin/stats]

## 需求一致性

- [ ] CHK005 是否明确 `/admin/activities` 的鉴权要求与其他 admin 端点一致（当前未声明 security）？ [Conflict, Contracts: /admin/activities]

## 非功能需求（审计/安全）

- [ ] CHK006 是否明确管理端操作审计需求（谁在何时做了什么变更、保留期限）？ [Gap, Plan: Summary]

## 安全合规（增强）

- [ ] CHK007 是否明确社区工作者登录的安全要求（密码策略、失败锁定、MFA是否需要）？ [安全, Spec: US1]
- [ ] CHK008 是否明确角色/权限模型的需求表达（最小权限、越权审计、权限变更留痕）？ [合规, Spec: Summary]
- [ ] CHK009 是否明确辖区老人数据属于敏感信息的访问边界（仅辖区内可见、导出限制）？ [合规, Spec: US2]
- [ ] CHK010 是否明确统计报表的隐私保护需求（脱敏、聚合粒度、防反推）？ [安全, Spec: US2]
- [ ] CHK011 是否明确管理端关键操作的二次确认与审批流需求（删除/封禁/批量操作）？ [安全, 风险控制]

## 适老化UX（新增）

- [ ] CHK012 是否明确后台数据看板的可读性要求（关键指标优先、清晰层级）？ [适老化, Spec: US2]
- [ ] CHK013 是否明确异常告警列表的可视化强调需求（颜色对比度、重要性排序）？ [适老化, 无障碍]
- [ ] CHK014 是否明确表单/筛选的可用性需求（默认值、快速筛选、错误提示清晰）？ [适老化, Spec: US2]
