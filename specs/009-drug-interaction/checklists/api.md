# API 需求质量 检查清单: 用药交互检查 (009-drug-interaction)

**目的**: 评估用药交互检查 API 需求文本质量（完整/清晰/一致/可度量/覆盖），不评估实现。
**创建日期**: 2026-02-20
**关联文档**: `D:\03_Study\Desktop\old\specs\009-drug-interaction\plan.md`

## 需求完整性

- [ ] CHK001 是否明确模块能力清单（相互作用检测、历史、风险确认、禁忌、食物相互作用）？ [完整性, Plan: Summary]
- [ ] CHK002 是否明确药物列表输入约束（通用名、去重、上限 30）并在 contract 中体现？ [Gap, Plan: Performance Goals; Contracts: /drug-interaction/check]
- [ ] CHK003 是否明确相互作用级别 X/D/C/B/A 的业务语义（风险含义、建议行动）？ [Gap, Contracts: /drug-interaction/check; Data Model: DrugInteraction]
- [ ] CHK004 是否明确历史 status(new/acknowledged/dismissed) 的状态机与转移条件？ [Completeness, Contracts: /drug-interaction/history; Data Model: DrugInteraction]
- [ ] CHK005 是否明确禁忌检测的输入来源与边界（drugName + 用户疾病/画像是否必需）？ [Gap, Contracts: /drug-interaction/contraindication; Plan: Summary]

## 需求一致性

- [ ] CHK006 是否统一响应包络（history/contraindication 返回数组但 check 返回 code/data）并指定权威规范？ [Conflict, Contracts: /drug-interaction/check; /drug-interaction/history]
- [ ] CHK007 是否明确 `/drug-interaction/food` 是否需要鉴权并与其他端点一致（当前未声明 security）？ [Conflict, Contracts: /drug-interaction/food]

## 验收标准可度量性

- [ ] CHK008 是否把“冲突检测<1秒/支持30种药物”写成可度量需求并明确测量条件？ [Measurability, Plan: Performance Goals]

## 场景覆盖

- [ ] CHK009 是否覆盖未知药物名输入时的需求（报错/忽略/建议替换）？ [Gap, Data Model: 验证规则]

## 非功能需求（合规/免责声明）

- [ ] CHK010 是否明确医疗建议免责声明/风险提示要求（仅供参考、紧急就医提示）？ [Gap, Plan: Constitution Check]

## 安全合规（增强）

- [ ] CHK011 是否明确药物查询记录的隐私保护需求（用药信息敏感）？ [安全, Spec: US1]
- [ ] CHK012 是否明确免责声明的展示需求（首次使用必读、确认机制）？ [合规, Spec: US1]
- [ ] CHK013 是否明确药物数据来源的合规声明需求（DDInter 2.0 引用）？ [合规, Plan: Storage]
- [ ] CHK014 是否明确用户确认冲突的记录需求（审计追踪）？ [安全, Data Model: DrugInteraction]
- [ ] CHK015 是否明确药物数据的更新频率与来源验证需求？ [合规, 数据来源]

## 适老化UX（新增）

- [ ] CHK016 是否明确冲突警告的适老化设计（颜色区分、大字提示）？ [适老化, Spec: US1]
- [ ] CHK017 是否明确冲突说明的适老化语言（非专业术语、通俗解释）？ [适老化, 宪法七]
- [ ] CHK018 是否明确确认对话框的适老化设计（大按钮、行动清晰）？ [适老化, 无障碍]
- [ ] CHK019 是否明确药物名称输入的适老化设计（联想选择、语音输入）？ [适老化, Spec: US1]
- [ ] CHK020 是否明确冲突级别的视觉区分需求（严重/中等/轻微）？ [适老化, Spec: US1]
