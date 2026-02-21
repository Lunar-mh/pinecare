# API 需求质量 检查清单: 用户注册与身份认证 (001-user-auth)

**目的**: 评估 001 模块 API 需求文档是否完整、清晰、一致、可度量且覆盖关键场景（只检查需求质量，不检查实现）。
**创建日期**: 2026-02-20
**关联文档**: `D:\03_Study\Desktop\old\specs\001-user-auth\plan.md`

**说明**: 依据 `plan.md`、`contracts/openapi.yaml`、`data-model.md`、`tasks.md` 生成；如文档间存在不一致，以"显式写清楚"为目标并标注为 [Conflict]/[Gap]。

## 需求完整性

- [ ] CHK001 是否明确列出认证能力范围（短信验证码、手机号注册/登录、微信登录、刷新令牌）而非仅在摘要中暗示？ [完整性, Plan: Summary]
- [ ] CHK002 是否为所有认证端点明确了请求体字段与必填约束（phone/purpose/code/password 等）？ [完整性, Contracts: /auth/send-sms; /auth/register/phone; /auth/login/phone]
- [ ] CHK003 是否明确"验证码用途 purpose"的枚举含义与各自流程边界（register/login/bind/reset_password）？ [清晰度, Contracts: /auth/send-sms]
- [ ] CHK004 是否完整定义了 token 体系（access_token/refresh_token 的生命周期、刷新策略、失效条件）？ [Gap, Contracts: /auth/refresh-token]
- [ ] CHK005 是否明确用户资料读写范围（可更新字段白名单、不可变字段）？ [Gap, Contracts: /user/profile]
- [ ] CHK006 是否明确紧急联系人 CRUD 的完整集合（新增/列表/删除是否足够，是否需要更新/设为主联系人）？ [Gap, Contracts: /user/emergency-contacts]
- [ ] CHK007 是否明确家属绑定能力的完整需求（二维码生成、绑定申请、同意/拒绝、解绑/撤销）？ [Gap, Contracts: /user/binding/qrcode; /user/binding/approve; Data Model: FamilyBinding]
- [ ] CHK008 是否明确账户安全保护需求（失败次数阈值、锁定时长、解锁方式、锁定提示）？ [完整性, Data Model: User]
- [ ] CHK009 是否明确注销账户的业务语义（软删除/硬删除、可恢复性、关联数据处理范围）？ [Gap, Contracts: /user/account/delete]
- [ ] CHK010 是否明确审计日志需求（哪些操作必须记录、字段最小集、保留期限）？ [Gap, Data Model: AuditLog]

## 需求清晰度

- [ ] CHK011 是否将"密码(加密传输)"写成可执行的需求（传输层、加密形式、是否需要二次加密）？ [Ambiguity, Contracts: /auth/register/phone]
- [ ] CHK012 是否明确验证码有效期与使用规则（5分钟有效、一次性使用、并发覆盖/并存规则）？ [完整性, Plan: Constraints; Data Model: SmsCode]
- [ ] CHK013 是否明确短信发送频控口径（按手机号/按 IP/按用途、每日上限、429 的语义）？ [Gap, Contracts: /auth/send-sms; Data Model: 验证规则]
- [ ] CHK014 是否明确微信登录输入 code 的有效窗口与失败语义（过期/重复/无效）？ [Gap, Contracts: /auth/login/wechat]
- [ ] CHK015 是否明确账号锁定解除方式（验证码解锁 vs 自动解锁）以及 `/user/unlock` 与锁定状态的关系？ [清晰度, Contracts: /user/unlock; Data Model: User]

## 需求一致性

- [ ] CHK016 是否统一所有端点的响应包络规范（是否都包含 `code/message/data`，以及 201/204 的 body 语义）？ [Consistency, Contracts: responses]
- [ ] CHK017 是否明确 401/409/423/429 等错误码在各流程中的触发条件并保持一致？ [Consistency, Contracts: components.responses]
- [ ] CHK018 是否确保 Data Model 的状态机与接口能力一致（lock 与 unlock、binding_status 与 approve/reject）？ [Consistency, Data Model: User; FamilyBinding]

## 验收标准可度量性

- [ ] CHK019 是否把性能目标写成可度量需求（<500ms/<3秒 的测量口径、p95/p99、起止点）？ [Measurability, Plan: Performance Goals]
- [ ] CHK020 是否明确"连续5次失败"的窗口与重置规则（跨天/跨设备、何时清零）？ [Measurability, Data Model: User]

## 场景覆盖（主/备选/异常/恢复）

- [ ] CHK021 是否覆盖注册/登录/刷新主流程的异常场景需求（验证码错误/过期、密码错误、账号锁定、重复注册）？ [Coverage, Contracts: /auth/register/phone; /auth/login/phone; components.responses]
- [ ] CHK022 是否覆盖短信服务/微信服务不可用时的需求（提示、重试是否属于需求）？ [Gap, Plan: Constraints]
- [ ] CHK023 是否覆盖 refresh_token 并发刷新/复用/泄露场景的需求（吊销、换发、冲突处理）？ [Gap, Contracts: /auth/refresh-token]

## 边界条件覆盖

- [ ] CHK024 是否定义手机号格式、密码复杂度等输入边界，并与 OpenAPI/数据模型一致？ [Completeness, Contracts: /auth/send-sms; Data Model: 验证规则]
- [ ] CHK025 是否定义紧急联系人"主联系人"规则（唯一性、缺省、删除后的规则）？ [Gap, Contracts: /user/emergency-contacts; Data Model: EmergencyContact]

## 非功能需求（安全/隐私/合规）

- [ ] CHK026 是否明确个人信息保护需求（手机号等字段的脱敏展示、日志脱敏）？ [Gap, Plan: Summary; Data Model: AuditLog]
- [ ] CHK027 是否明确账户注销的合规要求（保留/删除口径、审计保留）？ [Gap, Contracts: /user/account/delete]

## 依赖与假设

- [ ] CHK028 是否明确外部依赖与配置需求（短信服务、微信 AppID、验证码缓存）及其失败语义？ [Dependency, Plan: Constraints]
- [ ] CHK029 是否明确 Redis 仅用于验证码/会话的需求边界（丢失可接受性、补偿需求）？ [Ambiguity, Plan: Storage]

## 歧义与冲突待澄清

- [ ] CHK030 是否明确 refresh_token 是否一次性使用，以及并发刷新时的"最后一次生效"规则？ [Ambiguity, Contracts: /auth/refresh-token]
- [ ] CHK031 是否明确绑定二维码的过期时间、可用次数、泄露风险处置（撤销/旋转）？ [Gap, Contracts: /user/binding/qrcode; Data Model: FamilyBinding]
- [ ] CHK032 是否明确"密码加密传输"与仅依赖 HTTPS 的关系（是否需要前端二次加密）？ [Ambiguity, Contracts: /auth/register/phone]

## 安全合规（增强）

- [ ] CHK033 是否明确手机号、密码等敏感字段的存储加密需求（哈希算法、盐值策略）？ [安全, Spec: FR-008]
- [ ] CHK034 是否明确验证码的防重放/防爆破需求（单次使用、有效期、频控）？ [安全, Spec: Edge Cases]
- [ ] CHK035 是否明确审计日志的必需字段（操作类型、时间戳、操作者IP、结果）？ [合规, Data Model: AuditLog]
- [ ] CHK036 是否明确用户授权/同意的记录需求（隐私政策版本、授权时间）？ [合规, 个人信息保护法]
- [ ] CHK037 是否明确账号注销后的数据处理规则（软删除、关联数据清理、审计保留）？ [合规, Spec: US6]
- [ ] CHK038 是否明确家属绑定关系的授权确认流程需求？ [安全, Spec: US3]

## 适老化UX（新增）

- [ ] CHK039 是否明确核心操作步骤数限制（注册≤3步、登录≤2步）的需求？ [适老化, 宪法七]
- [ ] CHK040 是否明确错误提示语的适老化要求（非技术术语、可理解性）？ [适老化, Spec: US1]
- [ ] CHK041 是否明确验证码输入的容错设计（语音播报、自动填充）需求？ [适老化, 无障碍]
- [ ] CHK042 是否明确字体/按钮尺寸的适老化阈值（字体≥18sp、按钮≥44dp）？ [适老化, 宪法七]
- [ ] CHK043 是否明确微信登录作为手机号登录的适老化备选方案需求？ [适老化, Spec: US2]
- [ ] CHK044 是否明确家属代操作入口的需求（老人不会操作时的备选路径）？ [适老化, Spec: Edge Cases]