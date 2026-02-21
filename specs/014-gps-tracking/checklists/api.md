# API 需求质量 检查清单: GPS定位追踪 (014-gps-tracking)

**目的**: 评估 GPS 定位追踪 API 需求文字是否完整、清晰、一致、可度量且覆盖关键隐私/围栏场景（仅需求质量）。
**创建日期**: 2026-02-20
**关联文档**: `D:\03_Study\Desktop\old\specs\014-gps-tracking\plan.md`

## 需求完整性

- [ ] CHK001 是否明确模块能力清单（上传位置、当前位置、轨迹、围栏、告警）？ [完整性, Plan: Summary]
- [ ] CHK002 是否明确“仅家属可见/默认不开启”的具体需求口径？ [Ambiguity, Plan: Constitution Check]
- [ ] CHK003 是否为 upload/current/trail/fences/alerts 明确请求参数与返回结构（contract 缺少 schema）？ [Gap, Contracts: paths]
- [ ] CHK004 是否明确采样间隔（5分钟）是需求还是实现策略，以及对轨迹精度的影响说明？ [Gap, Plan: Summary]

## 验收标准可度量性

- [ ] CHK005 是否把“位置更新<1秒/轨迹查询<3秒”写成可度量需求并定义测量口径？ [Measurability, Plan: Performance Goals]

## 场景覆盖

- [ ] CHK006 是否覆盖围栏边界条件（点在边界、enter/exit/both、防抖/重复告警）在需求层面的描述？ [Gap, Data Model: GeoFence; FenceAlert]

## 非功能需求（隐私/安全/审计）

- [ ] CHK007 是否明确定位数据作为敏感信息的审计需求（谁查看过谁的位置、保留多久）？ [Gap, Plan: Constitution Check]

## 歧义与冲突待澄清

- [ ] CHK008 是否明确 API 路径前缀（是否存在 `/api/location/*` 差异）并指定权威口径？ [Ambiguity, Contracts: servers]

## 安全合规（增强）

- [ ] CHK009 是否明确定位数据的访问控制需求（仅绑定家属可见、默认关闭）？ [安全, Spec: US1]
- [ ] CHK010 是否明确位置上传与查询的授权与撤销机制（老人同意、家属解绑立即生效）？ [合规, Spec: US1]
- [ ] CHK011 是否明确位置数据的保留期限与最小化采集原则（只采集必要频率与范围）？ [合规, Spec: Summary]
- [ ] CHK012 是否明确围栏告警通知的合规性（用户授权、频次限制、内容脱敏）？ [合规, Spec: US3]
- [ ] CHK013 是否明确定位数据访问审计需求（谁在何时查了谁的位置）？ [合规, Plan: Constitution Check]

## 适老化UX（新增）

- [ ] CHK014 是否明确“查看位置”入口的适老化设计（一步直达、按钮明显）？ [适老化, Spec: US1]
- [ ] CHK015 是否明确位置获取失败时的适老化提示（原因+下一步操作建议）？ [适老化, Spec: US1]
- [ ] CHK016 是否明确轨迹展示的适老化可读性要求（清晰时间线、简化地图信息）？ [适老化, Spec: US2]
- [ ] CHK017 是否明确围栏告警的适老化文案与确认机制（避免误报焦虑）？ [适老化, Spec: US3]
