# API 需求质量 检查清单: 智慧用药提醒 (003-medication-reminder)

**目的**: 评估用药提醒相关 API 需求文本是否完整、清晰、一致、可度量且覆盖关键提醒场景（不评估实现）。
**创建日期**: 2026-02-20
**关联文档**: `D:\03_Study\Desktop\old\specs\003-medication-reminder\plan.md`

## 需求完整性

- [ ] CHK001 是否明确模块能力清单（计划管理、提醒/确认、日志查询、日历聚合、设置）？ [完整性, Plan: Summary]
- [ ] CHK002 是否为计划新增/列表明确字段约束（frequency 枚举、remind_times 格式、日期范围）？ [Completeness, Contracts: /medication/plans]
- [ ] CHK003 是否明确计划更新允许修改字段范围与部分更新语义？ [Gap, Contracts: /medication/plans/{id}]
- [ ] CHK004 是否明确服药记录 status 的完整状态机（pending/taken/missed/skipped）与转移触发条件？ [Completeness, Data Model: MedicationLog 状态转换]
- [ ] CHK005 是否明确确认接口的幂等语义与重复提交处理？ [Gap, Contracts: /medication/confirm]
- [ ] CHK006 是否明确日志查询的过滤/排序/分页需求（start/end 的边界与默认值）？ [Gap, Contracts: /medication/logs]
- [ ] CHK007 是否明确日历聚合返回结构（days/status/details 的定义与最小字段集）？ [Gap, Contracts: /medication/history/calendar]
- [ ] CHK008 是否明确提醒设置默认值策略并与数据模型一致？ [Consistency, Contracts: /medication/settings; Data Model: MedicationSettings]

## 需求清晰度

- [ ] CHK009 是否将“提醒送达率/确认率/延迟”写成可解释需求（统计口径、采集点）？ [Measurability, Plan: Performance Goals]
- [ ] CHK010 是否明确提醒触发时间与时区规则（remind_times 与 scheduled_time 的关系、跨天处理）？ [Gap, Data Model: MedicationPlan; MedicationLog]
- [ ] CHK011 是否明确二次提醒与 missed 的时间规则（30 分钟/2 小时）是固定需求还是可配置？ [清晰度, Data Model: MedicationLog 状态转换]
- [ ] CHK012 是否明确续药提醒阈值 `reminder_threshold` 的单位含义与计算方式？ [Ambiguity, Contracts: /medication/plans; Data Model: MedicationPlan]

## 需求一致性

- [ ] CHK013 是否确保 OpenAPI 与 Data Model 的字段命名/类型一致（remaining_quantity、reminder_threshold、is_active）？ [Consistency, Contracts: /medication/plans; Data Model: MedicationPlan]
- [ ] CHK014 是否统一响应包络规范与状态码语义（201/204/200 的 body 约定）？ [Gap, Contracts: responses]

## 验收标准可度量性

- [ ] CHK015 是否为“提醒可靠性”定义可度量的失败语义（发送失败、重试、最终失败的可观察定义）？ [Gap, Plan: Constraints]
- [ ] CHK016 是否明确“睡眠时段不提醒”的判定口径（跨天窗口、边界等于 start/end）？ [Gap, Contracts: /medication/settings]

## 场景覆盖（主/备选/异常/恢复）

- [ ] CHK017 是否覆盖用户未订阅消息时的需求（是否允许创建计划但不推送、提示与降级）？ [Gap, Plan: Constraints]
- [ ] CHK018 是否覆盖计划 end_date 为空（无限期）与到期后的提醒停止需求？ [Gap, Contracts: /medication/plans]
- [ ] CHK019 是否覆盖确认超时后家属同步的需求（family_sync_enabled 触发点、通知口径）？ [Gap, Contracts: /medication/settings; Data Model: ReminderQueue]

## 边界条件覆盖

- [ ] CHK020 是否明确 remind_times 数量上限与格式（HH:mm）以及非法值错误语义？ [Gap, Contracts: /medication/plans]
- [ ] CHK021 是否明确 remaining_quantity 为 0 或空时的续药提醒策略？ [Gap, Contracts: /medication/plans]

## 非功能需求（安全/隐私/可用性）

- [ ] CHK022 是否明确数据隔离需求（仅本人可见计划/日志；家属同步的可见范围）？ [Gap, Contracts: BearerAuth]
- [ ] CHK023 是否明确定时任务可靠性需求（错过触发的补偿策略是否属于需求）？ [Gap, Plan: Constraints]

## 依赖与假设

- [ ] CHK024 是否明确对微信服务通知的依赖与配额/失败语义（限频、模板变更）？ [Dependency, Plan: Primary Dependencies]
- [ ] CHK025 是否明确 Redis 队列/缓存丢失时的业务需求（是否允许丢提醒、是否需要补发）？ [Ambiguity, Plan: Storage]

## 歧义与冲突待澄清

- [ ] CHK026 是否明确 status=missed 的用户可操作性（是否允许补录/更正）？ [Gap, Data Model: MedicationLog]
- [ ] CHK027 是否明确日历聚合“当天状态”规则（同日多条记录如何汇总）？ [Gap, Contracts: /medication/history/calendar]

## 安全合规（增强）

- [ ] CHK028 是否明确用药计划数据的访问控制需求（仅本人及授权家属可见）？ [安全, Spec: FR-005]
- [ ] CHK029 是否明确服药记录的隐私保护需求（敏感健康信息、日志脱敏）？ [合规, Data Model: MedicationLog]
- [ ] CHK030 是否明确微信通知的合规性需求（用户订阅、模板审核、频次限制）？ [合规, Spec: Clarifications]
- [ ] CHK031 是否明确家属同步通知的授权确认需求（老人主动开启、可撤销）？ [安全, Spec: US4]
- [ ] CHK032 是否明确用药数据的审计日志需求（计划变更、确认记录）？ [合规, 审计]

## 适老化UX（新增）

- [ ] CHK033 是否明确添加用药计划的步骤数限制（≤3步）？ [适老化, 宪法七]
- [ ] CHK034 是否明确药品名称输入的适老化设计（常用药品联想、语音输入备选）？ [适老化, Spec: Assumptions]
- [ ] CHK035 是否明确用药提醒通知的适老化文案（大字显示、清晰行动指引）？ [适老化, Spec: US2]
- [ ] CHK036 是否明确“已服药”确认按钮的尺寸与位置（≥44dp、显著位置）？ [适老化, 无障碍]
- [ ] CHK037 是否明确服药日历的适老化设计（大字体、高对比度颜色区分）？ [适老化, Spec: US3]
- [ ] CHK038 是否明确续药提醒的适老化行动建议（一键联系医生、附近药店）？ [适老化, Spec: US6]
- [ ] CHK039 是否明确家属代操作入口的需求（老人不会添加计划时）？ [适老化, Spec: Edge Cases]
