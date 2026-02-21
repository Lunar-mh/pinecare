# API 需求质量 检查清单: 时间银行 (010-time-bank)

**目的**: 评估时间银行 API 需求文本质量（完整/清晰/一致/可度量/覆盖），不检查实现。
**创建日期**: 2026-02-20
**关联文档**: `D:\03_Study\Desktop\old\specs\010-time-bank\plan.md`

## 需求完整性

- [ ] CHK001 是否明确模块能力清单（账户/余额、服务记录与确认、历史、兑换、排行榜）？ [完整性, Plan: Summary]
- [ ] CHK002 是否明确账户/余额端点字段口径与缺省语义？ [Gap, Contracts: /time-bank/account; /time-bank/balance]
- [ ] CHK003 是否明确服务记录与确认的业务约束（duration 范围、状态机）并与数据模型一致？ [Completeness, Contracts: /time-bank/service/record; Data Model: ServiceRecord]
- [ ] CHK004 是否明确哈希链存证与三方签名在需求层面的含义与必须性？ [Gap, Plan: Summary; Data Model: ServiceRecord]
- [ ] CHK005 是否明确兑换的扣减规则、余额不足语义与状态机？ [Gap, Contracts: /time-bank/exchange; Data Model: ExchangeRecord]

## 需求清晰度

- [ ] CHK006 是否明确 time_coins 计算规则（duration 换算、不同服务类型倍率）？ [Gap, Data Model: ServiceRecord]
- [ ] CHK007 是否明确信用评分/等级规则并与 API 输出一致？ [Gap, Data Model: TimeAccount]

## 验收标准可度量性

- [ ] CHK008 是否把“交易处理<500ms/高并发”写成可度量需求并定义测量口径？ [Measurability, Plan: Performance Goals]

## 歧义与冲突待澄清

- [ ] CHK009 是否明确哈希链/签名是否为 MVP 强制要求还是后续增强？ [Ambiguity, Plan: Summary]

## 安全合规（增强）

- [ ] CHK010 是否明确志愿者实名认证的合规要求（字段最小化、加密存储、审核留痕）？ [合规, Spec: US1]
- [ ] CHK011 是否明确服务记录与兑换记录的审计追踪需求（防篡改证据链、查询权限）？ [安全, Spec: Input]
- [ ] CHK012 是否明确时间币余额变更的访问控制与对账要求（仅本人可见、管理员审计）？ [安全, Spec: US2]
- [ ] CHK013 是否明确排行榜的隐私保护需求（展示字段脱敏、可选择隐藏）？ [合规, 隐私]
- [ ] CHK014 是否明确纠纷/撤销/更正记录的合规处理需求（申诉、回滚留痕）？ [合规, Spec: US3]

## 适老化UX（新增）

- [ ] CHK015 是否明确关键操作的步骤数限制（发布需求/确认服务/兑换≤3步）？ [适老化, 宪法七]
- [ ] CHK016 是否明确时间币/时长的解释性文案需求（避免专业术语、通俗说明）？ [适老化, Spec: Summary]
- [ ] CHK017 是否明确确认服务与兑换的风险提示与二次确认需求（防误触）？ [适老化, 无障碍]
- [ ] CHK018 是否明确余额与交易记录的适老化展示需求（大字体、清晰层级）？ [适老化, 宪法七]
- [ ] CHK019 是否明确排行榜的适老化展示需求（大字号、可读性、无过度信息）？ [适老化, 宪法七]
