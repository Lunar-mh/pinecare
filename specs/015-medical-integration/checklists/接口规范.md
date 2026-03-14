# API 需求质量 检查清单: 医疗资源整合 (015-medical-integration)

**目的**: 评估医疗资源整合 API 需求文字是否完整、清晰、一致、可度量且覆盖安全/授权/第三方依赖（仅需求质量）。
**创建日期**: 2026-02-20
**关联文档**: `D:\03_Study\Desktop\old\specs\015-medical-integration\plan.md`

## 需求完整性

- [ ] CHK001 是否明确 MVP 能力范围（医院/科室/医生查询、问诊发起、预约、报告查询）与非 MVP 边界？ [完整性, Plan: Summary]
- [ ] CHK002 是否明确第三方医疗 API 依赖的需求语义（超时/限流/部分不可用的用户可见语义）？ [Gap, Plan: Technical Context]
- [ ] CHK003 是否明确患者授权/同意的需求（获取、存储、撤销、审计）？ [Gap, Plan: Summary]
- [ ] CHK004 是否明确敏感字段（patient_id_no/diagnosis/report content）的脱敏与日志约束需求？ [Gap, Data Model: Appointment; OnlineConsultation; MedicalReport]
- [ ] CHK005 是否明确 quickstart 与 OpenAPI 端点差异的处理策略（哪些是必须需求）？ [Conflict, Contracts: paths]

## 场景覆盖

- [ ] CHK006 是否覆盖第三方成功但本地落库失败的恢复需求（补偿、重试、对账口径）？ [Gap, Plan: Storage]

## 非功能需求（安全/审计/合规）

- [ ] CHK007 是否将“加密传输/访问审计/数据脱敏”写成可操作且可度量的需求条款？ [Ambiguity, Plan: Summary]

## 安全合规（增强）

- [ ] CHK008 是否明确患者授权的全生命周期需求（获取、存储、撤销、审计、过期）？ [合规, Spec: US1]
- [ ] CHK009 是否明确身份证号/诊断/报告内容等敏感字段的加密与脱敏需求（展示与日志）？ [安全, Spec: US1]
- [ ] CHK010 是否明确第三方医疗 API 的合规要求（数据出境、供应商协议、最小化传输）？ [合规, 第三方依赖]
- [ ] CHK011 是否明确在线问诊/处方相关的免责声明与责任边界（不替代线下就医）？ [合规, Spec: US2]
- [ ] CHK012 是否明确报告同步失败/重复同步的对账与纠错需求（幂等键、补偿策略）？ [安全, Spec: US1]

## 适老化UX（新增）

- [ ] CHK013 是否明确体检报告的适老化展示要求（大字体、异常项高亮、通俗解释）？ [适老化, Spec: US1]
- [ ] CHK014 是否明确在线问诊的适老化交互（一步发起、清晰的等待提示）？ [适老化, Spec: US2]
- [ ] CHK015 是否明确预约/报告查询的错误提示适老化要求（非技术术语、行动建议）？ [适老化, 无障碍]
