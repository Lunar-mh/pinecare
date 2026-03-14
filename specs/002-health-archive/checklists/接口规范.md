# API 需求质量 检查清单: 全维健康档案基础版 (002-health-archive)

**目的**: 评估 002 模块健康档案 API 的需求文本质量（完整/清晰/一致/可度量/覆盖），不涉及实现验证。
**创建日期**: 2026-02-20
**关联文档**: `D:\03_Study\Desktop\old\specs\002-health-archive\plan.md`

## 需求完整性

- [ ] CHK001 是否明确本模块包含的能力清单（today、trend、manual、sync、设备管理）？ [完整性, Plan: Summary]
- [ ] CHK002 是否为 `GET /health/today` 明确数据字段口径与空数据语义？ [Gap, Contracts: /health/today]
- [ ] CHK003 是否为 `GET /health/trend` 明确趋势数据点定义（时间粒度、缺失值处理、排序）？ [Gap, Contracts: /health/trend]
- [ ] CHK004 是否为 `POST /health/manual` 明确 metric_type 枚举与 value 格式，并与数据模型一致？ [Completeness, Contracts: /health/manual; Data Model: 验证规则]
- [ ] CHK005 是否为 `POST /health/sync` 明确 device_id 与数据数组字段最小集、批量幂等语义？ [Gap, Contracts: /health/sync; Data Model: HealthRecord]
- [ ] CHK006 是否完整定义设备管理需求（bind/unbind/list/set-primary）及主设备唯一性规则？ [Completeness, Contracts: /device/bind; /device/set-primary; Data Model: DeviceBinding]
- [ ] CHK007 是否明确家属查询的授权规则（`user_id` 参数何时允许、绑定关系口径）？ [Gap, Contracts: /health/today user_id]
- [ ] CHK008 是否明确异常阈值/正常范围的需求表达（阈值来源、可配置性、is_abnormal 判定口径）？ [Completeness, Data Model: 健康指标正常范围]

## 需求清晰度

- [ ] CHK009 是否明确 `metric_type`/`period` 非法值的错误语义（错误码/信息/包络）？ [Gap, Contracts: /health/trend]
- [ ] CHK010 是否明确 `measured_at` 与 `synced_at` 的含义差异、时区与回填窗口？ [Ambiguity, Data Model: HealthRecord]
- [ ] CHK011 是否明确“批量采集+同步”在需求层面的约束（最大批量、重复点处理）？ [Gap, Plan: Constraints]

## 需求一致性

- [ ] CHK012 是否确保 OpenAPI metric_type 枚举与 Data Model metric_type 枚举一致（blood_sugar 等覆盖关系）？ [Conflict, Contracts: /health/manual; Data Model: HealthRecord]
- [ ] CHK013 是否确保设备字段定义一致（device_mac 可空/必填、device_type 默认值）？ [Consistency, Contracts: /device/bind; Data Model: DeviceBinding]
- [ ] CHK014 是否统一响应包络规范（对象/数组返回是否都包含 `code/message/data`）？ [Gap, Contracts: responses]

## 验收标准可度量性

- [ ] CHK015 是否将性能目标写成可度量需求并映射到端点（首屏加载、同步成功率、家属端延迟）？ [Measurability, Plan: Performance Goals]
- [ ] CHK016 是否明确“同步成功率”的统计口径（成功定义、失败重试是否计入）？ [Ambiguity, Plan: Performance Goals]

## 场景覆盖（主/备选/异常/恢复）

- [ ] CHK017 是否覆盖设备解绑后的同步/查询行为需求（解绑后是否拒绝 sync、历史数据是否保留）？ [Gap, Contracts: /device/unbind; /health/sync]
- [ ] CHK018 是否覆盖主设备切换的并发/竞态需求（并发设置、最终一致性规则）？ [Gap, Contracts: /device/set-primary]
- [ ] CHK019 是否覆盖手动录入与设备数据冲突的需求（同一时刻多来源如何展示/取舍）？ [Gap, Data Model: HealthRecord source]
- [ ] CHK020 是否覆盖家属无绑定关系访问时的需求（403 语义、是否泄露目标存在性）？ [Gap, Contracts: /health/today user_id]

## 边界条件覆盖

- [ ] CHK021 是否明确各指标 value 的范围/格式并与 Data Model 一致（心率/血氧/步数/血糖等）？ [Completeness, Data Model: 验证规则]
- [ ] CHK022 是否明确睡眠指标单位、分段定义与缺失值语义？ [Gap, Contracts: /health/today; Data Model: SleepMetric]

## 非功能需求（安全/隐私/适老化）

- [ ] CHK023 是否明确健康数据隐私要求（谁可见、默认策略、审计）？ [Gap, Plan: Summary]
- [ ] CHK024 是否将“适老化大字展示”转化为可检查需求（字号阈值、信息层级）？ [Gap, Plan: Constitution Check]

## 依赖与假设

- [ ] CHK025 是否明确对微信蓝牙采集侧的假设与失败语义（授权失败、设备不支持）对后端需求的影响？ [Dependency, Plan: Constraints]
- [ ] CHK026 是否明确 Redis 缓存失效与回源规则属于需求还是实现细节？ [Ambiguity, Plan: Storage]

## 歧义与冲突待澄清

- [ ] CHK027 是否明确趋势查询最大时间范围与分页/限流需求（防止大数据量导致超时）？ [Gap, Contracts: /health/trend]
- [ ] CHK028 是否明确异常阈值是否可配置（按年龄/慢病个性化）还是固定阈值？ [Ambiguity, Data Model: 健康指标正常范围]

## 安全合规（增强）

- [ ] CHK029 是否明确健康数据的存储加密需求（字段级加密、传输加密）？ [安全, Spec: FR-008]
- [ ] CHK030 是否明确健康数据访问的审计日志需求（谁在何时查看/同步了谁的数据）？ [合规, Data Model: AuditLog]
- [ ] CHK031 是否明确家属查看健康数据的授权范围与撤销机制？ [安全, Spec: US4]
- [ ] CHK032 是否明确健康数据保留期限与过期清理规则（3年）？ [合规, Spec: Clarifications]
- [ ] CHK033 是否明确健康数据导出/删除的用户权利需求（个人信息保护法）？ [合规, 个人信息保护法]
- [ ] CHK034 是否明确多设备绑定的安全校验需求（设备认证、防伪造）？ [安全, Spec: FR-009]

## 适老化UX（新增）

- [ ] CHK035 是否明确核心指标字体≥36sp的适老化展示需求？ [适老化, Spec: FR-003]
- [ ] CHK036 是否明确"异常指标高亮"的视觉设计需求（颜色对比度≥4.5:1）？ [适老化, 无障碍]
- [ ] CHK037 是否明确健康数据"一目了然"的信息层级需求（核心指标优先、次要信息折叠）？ [适老化, 宪法七]
- [ ] CHK038 是否明确趋势图的可读性需求（大字体标签、清晰的图例）？ [适老化, Spec: US3]
- [ ] CHK039 是否明确手环同步的"一键操作"需求（单次点击完成同步）？ [适老化, 宪法七]
- [ ] CHK040 是否明确"数据未更新"提示的适老化文案（非技术术语、行动建议）？ [适老化, Spec: Edge Cases]
- [ ] CHK041 是否明确手动录入的简化交互需求（语音录入备选、常用值快选）？ [适老化, Spec: US5]
