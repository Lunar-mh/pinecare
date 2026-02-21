# API 需求质量 检查清单: AI陪伴 (011-ai-companion)

**目的**: 评估 AI 陪伴 API 需求文本质量（完整/清晰/一致/可度量/覆盖），不检查实现。
**创建日期**: 2026-02-20
**关联文档**: `D:\03_Study\Desktop\old\specs\011-ai-companion\plan.md`

## 需求完整性

- [ ] CHK001 是否明确模块能力清单（情感对话、游戏列表/成绩、情绪趋势、怀旧推荐）？ [完整性, Plan: Summary]
- [ ] CHK002 是否为对话端点明确输入约束与会话语义（是否需要 sessionId、上下文保留）？ [Gap, Contracts: /companion/chat]
- [ ] CHK003 是否明确游戏列表返回字段最小集与来源（静态/配置/可扩展）？ [Gap, Contracts: /companion/games]
- [ ] CHK004 是否明确成绩记录端点必填字段与幂等语义？ [Gap, Contracts: /companion/game/record; Data Model: GameRecord]
- [ ] CHK005 是否明确情绪趋势的时间窗口与聚合口径？ [Gap, Contracts: /companion/emotion; Data Model: EmotionTrack]
- [ ] CHK006 是否明确怀旧推荐 decade 参数语义与输出字段最小集？ [Gap, Contracts: /companion/nostalgia]

## 验收标准可度量性

- [ ] CHK007 是否把“对话响应<3秒/游戏加载<1秒”写成可度量需求并映射到端点？ [Measurability, Plan: Performance Goals]

## 非功能需求（隐私/合规）

- [ ] CHK008 是否明确陪伴会话/情绪数据的隐私要求（可见性、保留期限、审计）？ [Gap, Plan: Summary; Data Model: EmotionTrack]

## 安全合规（增强）

- [ ] CHK009 是否明确心理关怀场景的风险处置需求（自伤/急性风险时的提示与引导）？ [合规, Spec: US1]
- [ ] CHK010 是否明确对话内容的敏感信息处理需求（脱敏、日志最小化）？ [安全, Spec: US1]
- [ ] CHK011 是否明确情绪数据的采集与使用授权需求（可关闭、可删除）？ [合规, Spec: Input]
- [ ] CHK012 是否明确儿童/第三方隐私风险（家属代操作、共享设备）下的访问控制需求？ [安全, 场景]
- [ ] CHK013 是否明确内容安全与模型输出治理需求（不提供诊断/处方、拒答策略）？ [合规, Spec: Input]

## 适老化UX（新增）

- [ ] CHK014 是否明确对话界面的适老化要求（大字体、简洁气泡、明显输入按钮）？ [适老化, Spec: US1]
- [ ] CHK015 是否明确共情/安慰措辞的适老化语言要求（短句、避免专业术语）？ [适老化, Spec: US1]
- [ ] CHK016 是否明确负面情绪识别后的适老化引导（一步直达求助/家属）？ [适老化, Spec: US1]
- [ ] CHK017 是否明确游戏列表与成绩展示的适老化要求（大按钮、少选项、清晰反馈）？ [适老化, Spec: US2]
- [ ] CHK018 是否明确怀旧推荐的适老化交互（年代选择清晰、默认推荐合理）？ [适老化, Spec: US2]
