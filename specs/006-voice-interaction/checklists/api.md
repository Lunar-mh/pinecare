# API 需求质量 检查清单: 语音交互基础 (006-voice-interaction)

**目的**: 评估语音交互相关 API 需求文本质量（完整/清晰/一致/可度量/覆盖），不涉及实现验证。
**创建日期**: 2026-02-20
**关联文档**: `D:\03_Study\Desktop\old\specs\006-voice-interaction\plan.md`

**说明**: 当前 OpenAPI 合约仅包含 `/voice/recognize`，而数据模型包含会话/日志；清单重点标记需求与合约缺口。

## 需求完整性

- [ ] CHK001 是否明确语音交互 MVP 能力边界（ASR、TTS、会话与日志留存）？ [完整性, Plan: Summary; Data Model: VoiceSession]
- [ ] CHK002 是否在 contract 中完整列出语音交互端点集合（recognize 之外是否需要 synthesize/会话查询）？ [Gap, Contracts: paths]
- [ ] CHK003 是否明确音频输入输出的需求约束（编码、最大时长/大小、采样率、格式）？ [Gap, Contracts: /voice/recognize]
- [ ] CHK004 是否明确方言识别范围与识别失败语义？ [Gap, Plan: Summary]
- [ ] CHK005 是否明确会话/日志的留存与可见性需求（是否可查询、保留期限、隐私）？ [Gap, Data Model: VoiceCommandLog]

## 需求清晰度

- [ ] CHK006 是否明确“语音唤醒/语音控制”是否属于后端需求还是前端能力？ [Ambiguity, Plan: Summary]
- [ ] CHK007 是否明确 recognized_text 与 user_text/response_text 的关系与来源？ [Ambiguity, Data Model: VoiceCommandLog]

## 需求一致性

- [ ] CHK008 是否统一响应包络规范并在 contract 中体现？ [Gap, Contracts: responses]
- [ ] CHK009 是否确保鉴权范围与模块定位一致（是否必须 BearerAuth）？ [Consistency, Contracts: /voice/recognize security]

## 场景覆盖

- [ ] CHK010 是否覆盖第三方 ASR/TTS 不可用/超时的需求语义（提示、重试是否属于需求）？ [Gap, Plan: Primary Dependencies]

## 边界条件覆盖

- [ ] CHK011 是否明确音频过大/格式错误/过频调用的错误语义与限频需求？ [Gap, Contracts: /voice/recognize]

## 非功能需求（隐私/合规）

- [ ] CHK012 是否明确语音数据/文本的敏感信息处理（脱敏、日志限制、用户授权）？ [Gap, Plan: Summary]

## 歧义与冲突待澄清

- [ ] CHK013 是否需要补齐 contract：TTS 端点、会话历史端点、以及统一响应结构？ [Gap, Contracts: paths; Data Model: VoiceSession]

## 安全合规（增强）

- [ ] CHK014 是否明确语音数据的收集与存储授权需求（用户明确同意）？ [合规, 个人信息保护法]
- [ ] CHK015 是否明确语音数据的保留期限与清理规则？ [合规, 数据保留]
- [ ] CHK016 是否明确语音/文本内容的敏感信息处理（脱敏、日志限制）？ [安全, Spec: US2]
- [ ] CHK017 是否明确会话记录的访问控制（仅本人可见）？ [安全, Data Model: VoiceSession]
- [ ] CHK018 是否明确第三方 ASR/TTS 供应商的数据处理合规要求？ [合规, 第三方服务]

## 适老化UX（新增）

- [ ] CHK019 是否明确语音唤醒词的适老化设计（简短易记、支持方言）？ [适老化, Spec: US1]
- [ ] CHK020 是否明确语音交互的容错设计（识别失败时的友好提示）？ [适老化, Spec: US2]
- [ ] CHK021 是否明确语音播报的适老化要求（语速适中、清晰、可调节）？ [适老化, 无障碍]
- [ ] CHK022 是否明确麦克风按钮的适老化设计（大图标、显著位置）？ [适老化, Spec: US1]
- [ ] CHK023 是否明确语音反馈的及时性要求（响应时间阈值）？ [适老化, 宪法七]
- [ ] CHK024 是否明确方言识别的支持范围需求（主流方言覆盖）？ [适老化, Spec: Input]
