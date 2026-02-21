# API 需求质量 检查清单: AI健康顾问 (008-ai-health-advice)

**目的**: 评估 AI 健康顾问 API 需求文字是否完整、清晰、一致、可度量、场景覆盖充分（仅需求质量，不检查实现）。
**创建日期**: 2026-02-20
**关联文档**: `D:\03_Study\Desktop\old\specs\008-ai-health-advice\plan.md`

## 需求完整性

- [ ] CHK001 是否明确模块能力清单（文字咨询、语音咨询、历史、画像管理、内容安全、限流）？ [完整性, Plan: Summary]
- [ ] CHK002 是否为 `/ai-consult/chat` 明确 message/sessionId 的约束与会话语义（新会话 vs 续聊）？ [Gap, Contracts: /ai-consult/chat; Data Model: ConsultRecord]
- [ ] CHK003 是否明确历史查询的排序/分页/字段口径（role/content/createdAt）？ [Gap, Contracts: /ai-consult/history]
- [ ] CHK004 是否为语音咨询明确 audioData 的格式/大小/时长要求与返回音频编码约定？ [Gap, Contracts: /ai-consult/voice]
- [ ] CHK005 是否明确健康画像字段允许值/默认值与 JSON 字段语义？ [Gap, Contracts: /ai-consult/profile; Data Model: HealthProfile]
- [ ] CHK006 是否明确敏感内容记录与处置需求（risk_level 判定、拦截/放行/上报）？ [Gap, Data Model: SensitiveRecord; Plan: Constraints]

## 需求清晰度

- [ ] CHK007 是否明确“个性化”使用哪些画像字段/健康指标（避免泛化描述）？ [Ambiguity, Plan: Summary; Data Model: HealthProfile]
- [ ] CHK008 是否明确免责声明要求（文案、出现位置、是否每次必出）？ [Gap, Plan: Constitution Check]

## 需求一致性

- [ ] CHK009 是否统一响应包络（chat 使用 code/data，但 voice/profile 的包络/字段是否一致）？ [Conflict, Contracts: /ai-consult/chat; /ai-consult/voice]

## 验收标准可度量性

- [ ] CHK010 是否把“AI响应<5秒/语音合成<1秒”写成可度量需求并映射到端点？ [Measurability, Plan: Performance Goals]

## 场景覆盖

- [ ] CHK011 是否覆盖第三方 AI/内容安全 API 失败时的需求语义（降级/重试/提示）？ [Gap, Plan: Constraints]
- [ ] CHK012 是否覆盖 Redis 会话缓存丢失时的需求语义（上下文丢失提示、回源规则）？ [Gap, Plan: Storage]

## 非功能需求（隐私/合规）

- [ ] CHK013 是否明确咨询记录/敏感记录的隐私与审计要求（访问、导出、保留期限）？ [Gap, Data Model: ConsultRecord; SensitiveRecord]

## 歧义与冲突待澄清

- [ ] CHK014 是否明确 OpenAPI 路径与实际路由前缀（是否存在 `/api/ai-consult/*` 差异）并指定权威口径？ [Ambiguity, Contracts: servers]

## 安全合规（增强）

- [ ] CHK015 是否明确 AI 咨询记录的隐私保护需求（敏感健康信息、访问控制）？ [安全, Spec: US1]
- [ ] CHK016 是否明确用户对 AI 建议的知情同意需求（仅供参考、不替代医嘱）？ [合规, Spec: Input]
- [ ] CHK017 是否明确敏感记录的审计需求（哪些内容被标记、访问日志）？ [合规, Data Model: SensitiveRecord]
- [ ] CHK018 是否明确 AI 咨询数据的保留期限与导出权利？ [合规, 个人信息保护法]
- [ ] CHK019 是否明确内容安全检测失败时的用户告知需求？ [安全, Plan: Constraints]

## 适老化UX（新增）

- [ ] CHK020 是否明确 AI 建议的适老化呈现（大字体、简洁语言、行动指引清晰）？ [适老化, Spec: US1]
- [ ] CHK021 是否明确咨询交互的适老化设计（语音输入备选、一键回复）？ [适老化, 宪法七]
- [ ] CHK022 是否明确 AI 响应等待状态的适老化设计（进度提示、避免焦虑）？ [适老化, 无障碍]
- [ ] CHK023 是否明确建议卡片的适老化交互（大按钮、清晰层级）？ [适老化, Spec: US1]
- [ ] CHK024 是否明确关闭每日建议的适老化入口（设置项明显、操作简单）？ [适老化, Spec: US2]
