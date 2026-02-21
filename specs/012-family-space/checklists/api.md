# API 需求质量 检查清单: 家庭空间 (012-family-space)

**目的**: 评估家庭空间 API 需求文本质量（完整/清晰/一致/可度量/覆盖），不检查实现。
**创建日期**: 2026-02-20
**关联文档**: `D:\03_Study\Desktop\old\specs\012-family-space\plan.md`

## 需求完整性

- [ ] CHK001 是否明确模块能力清单（语音留言、相册、孝心值、排行榜）？ [完整性, Plan: Summary]
- [ ] CHK002 是否明确语音留言发送的输入格式/大小/时长约束与返回字段？ [Gap, Contracts: /family/message/send; Data Model: VoiceMessage]
- [ ] CHK003 是否明确留言列表的排序/分页/播放状态语义？ [Gap, Contracts: /family/message/list; Data Model: VoiceMessage]
- [ ] CHK004 是否明确相册上传的图片格式/大小/元数据与返回字段？ [Gap, Contracts: /family/album/upload; Data Model: FamilyAlbum]
- [ ] CHK005 是否明确孝心值积分规则（action_type 触发、加减分、是否可撤销）？ [Gap, Data Model: FamilyPoints]

## 依赖与假设

- [ ] CHK006 是否明确 OSS 依赖的需求语义（上传失败、URL 可用性、过期策略）？ [Dependency, Plan: Technical Context]

## 需求一致性

- [ ] CHK007 是否明确 `/family/leaderboard` 是否需要鉴权并与其他端点一致（当前未声明 security）？ [Conflict, Contracts: /family/leaderboard]

## 安全合规（增强）

- [ ] CHK008 是否明确家庭群组成员的访问控制需求（谁能看/发/删留言与相册）？ [安全, Spec: US1]
- [ ] CHK009 是否明确语音留言与相册内容的隐私保护需求（加密存储、链接防泄露）？ [合规, Spec: US2]
- [ ] CHK010 是否明确上传内容的合规要求（内容审核、违规处理）？ [合规, 内容安全]
- [ ] CHK011 是否明确孝心值规则的可审计性需求（加分/扣分原因、可追溯）？ [合规, Data Model: FamilyPoints]
- [ ] CHK012 是否明确家庭空间数据的保留期限与用户删除权利？ [合规, 个人信息保护法]

## 适老化UX（新增）

- [ ] CHK013 是否明确老人端查看留言/相册的适老化展示要求（大字体、大图、简洁布局）？ [适老化, Spec: US2]
- [ ] CHK014 是否明确语音留言播放/录制的适老化交互（大按钮、清晰状态提示）？ [适老化, 无障碍]
- [ ] CHK015 是否明确相册上传的适老化流程（一步选择、自动压缩提示）？ [适老化, 宪法七]
- [ ] CHK016 是否明确排行榜的适老化展示（避免羞辱性排名、可隐藏）？ [适老化, 宪法七]
- [ ] CHK017 是否明确通知/提醒的适老化文案（明确是谁发的、要做什么）？ [适老化, Spec: US2]
