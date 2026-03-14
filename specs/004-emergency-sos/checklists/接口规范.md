# API 需求质量 检查清单: 一键紧急救援 (004-emergency-sos)

**目的**: 评估 SOS 紧急救援 API 需求文本的质量（完整/清晰/一致/可度量/覆盖），不涉及实现验证。
**创建日期**: 2026-02-20
**关联文档**: `D:\03_Study\Desktop\old\specs\004-emergency-sos\plan.md`

## 需求完整性

- [ ] CHK001 是否明确模块能力范围（触发、取消、通知、历史、状态流转、自动解决）？ [完整性, Plan: Summary]
- [ ] CHK002 是否为触发/取消接口明确请求体字段约束（latitude/longitude、event_id）？ [Gap, Contracts: /sos/trigger; /sos/cancel]
- [ ] CHK003 是否明确 SOS 事件状态全集与转移规则（triggered/confirmed/resolved/cancelled）？ [Completeness, Data Model: SosEvent]
- [ ] CHK004 是否明确通知记录需求（wechat/sms 双通道、pending/sent/failed、sent_at）？ [Completeness, Data Model: SosNotification]
- [ ] CHK005 是否在 API 需求中明确“5 秒取消窗口”的口径（起点、超时语义）？ [Gap, Plan: Summary]
- [ ] CHK006 是否明确历史查询的分页/过滤/排序需求？ [Gap, Contracts: /sos/history]

## 需求清晰度

- [ ] CHK007 是否明确触发接口返回字段（event_id/event_status/位置回显）？ [Gap, Contracts: /sos/trigger responses]
- [ ] CHK008 是否明确取消接口在不同状态下的语义（已通知后是否允许取消、重复取消）？ [Gap, Contracts: /sos/cancel]
- [ ] CHK009 是否明确“社区响应/拨打120/位置共享”等在本期 API 中的边界与排除项？ [Ambiguity, Plan: Summary]

## 需求一致性

- [ ] CHK010 是否统一响应包络规范（contract 当前多为“成功”描述，无 schema）？ [Gap, Contracts: responses]
- [ ] CHK011 是否确保 contract 的接口集合与 Data Model 状态机一致（contract 仅含 trigger/cancel/history，但状态机含 confirmed/resolved）？ [Conflict, Contracts: paths; Data Model: SosEvent]

## 验收标准可度量性

- [ ] CHK012 是否将“通知延迟 <3秒/位置成功率/响应<15分钟”写成可度量需求并映射到接口/事件？ [Measurability, Plan: Performance Goals]
- [ ] CHK013 是否明确通知失败的度量口径（失败定义、重试是否属于需求）？ [Gap, Data Model: SosNotification]

## 场景覆盖（主/备选/异常/恢复）

- [ ] CHK014 是否覆盖外部通道失败的需求（触发成功但部分通知失败时的用户可见语义）？ [Gap, Plan: Summary]
- [ ] CHK015 是否覆盖位置缺失/获取失败时的需求语义？ [Gap, Data Model: SosEvent]
- [ ] CHK016 是否覆盖短时间多次触发的需求（合并/拒绝/冷却期）？ [Gap, Plan: Summary]
- [ ] CHK017 是否覆盖队列/缓存丢失后的补偿需求（是否需要自动重发）？ [Gap, Plan: Storage]

## 边界条件覆盖

- [ ] CHK018 是否明确 event_id 的安全性（是否可枚举、是否需要防重放）？ [Gap, Contracts: /sos/cancel]
- [ ] CHK019 是否明确通知对象选择规则（主联系人优先、去重）？ [Gap, Data Model: SosNotification]

## 非功能需求（安全/隐私/审计）

- [ ] CHK020 是否明确 SOS 数据隐私要求（谁可见、日志脱敏、访问审计）？ [Gap, Plan: Summary]

## 依赖与假设

- [ ] CHK021 是否明确对微信通知与短信服务的依赖与失败语义？ [Dependency, Plan: Primary Dependencies]

## 歧义与冲突待澄清

- [ ] CHK022 是否明确“确认/解决”相关 API 是否为必须项，以及是否需要在 contract 中体现？ [Gap, Data Model: SosEvent; Contracts: paths]
- [ ] CHK023 是否明确历史接口是否需要包含通知摘要（成功/失败计数）？ [Gap, Contracts: /sos/history]

## 安全合规（增强）

- [ ] CHK024 是否明确 SOS 事件的访问控制需求（仅本人及紧急联系人可见）？ [安全, Spec: US2]
- [ ] CHK025 是否明确位置数据的隐私保护需求（加密存储、访问审计）？ [合规, Spec: US2]
- [ ] CHK026 是否明确 SOS 事件的保留期限与清理规则？ [合规, 数据保留]
- [ ] CHK027 是否明确紧急联系人数据的存储与使用授权？ [安全, Spec: US2]
- [ ] CHK028 是否明确短信/微信通知的合规性（用户授权、频次限制）？ [合规, Spec: US2]

## 适老化UX（新增）

- [ ] CHK029 是否明确 SOS 按钮的适老化设计（尺寸≥64dp、显著位置、高对比度）？ [适老化, Spec: US1]
- [ ] CHK030 是否明确“一键触发”的步骤数限制（1步触发）？ [适老化, 宪法七]
- [ ] CHK031 是否明确 5 秒取消窗口的适老化设计（大字倒计时、语音提示）？ [适老化, Plan: Constraints]
- [ ] CHK032 是否明确紧急状态下的语音引导需求（播报当前状态、下一步行动）？ [适老化, 无障碍]
- [ ] CHK033 是否明确拨打 120 的适老化入口（大按钮、无需输入号码）？ [适老化, Spec: US3]
- [ ] CHK034 是否明确 SOS 通知的适老化文案（家属收到清晰、紧迫的提示）？ [适老化, Spec: US2]
