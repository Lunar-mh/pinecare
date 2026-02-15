# Feature Specification: 一键紧急救援

**Feature Branch**: `004-emergency-sos`  
**Created**: 2025-07-18  
**Status**: Draft  
**Input**: 银伴平台MVP第一批核心功能 - SOS紧急呼叫功能

---

## User Scenarios & Testing

### User Story 1 - 一键触发SOS (Priority: P1)

王大爷突然感觉胸闷不适，他按下手机屏幕上的"SOS"大按钮。系统立即进入紧急呼叫流程。

**Why this priority**: 紧急救援是平台的核心安全保障功能，必须简单易操作，一步直达

**Independent Test**: 可独立测试SOS按钮触发流程

**Acceptance Scenarios**:

1. **Given** 老人在小程序首页，**When** 点击巨大的SOS按钮，**Then** 进入紧急呼叫确认页面
2. **Given** 老人在紧急呼叫确认页面，**When** 确认呼叫，**Then** 触发紧急呼叫流程：通知家属 + 显示拨打120界面
3. **Given** 老人点击SOS后改变主意，**When** 点击取消，**Then** 取消呼叫，返回首页

---

### User Story 2 - 紧急联系人收到通知 (Priority: P1)

王大爷触发了SOS后，系统立即给他的儿子小王发送了紧急通知，包含老人的位置信息和健康档案摘要。

**Why this priority**: 家属是老人最重要的照护者，必须第一时间知晓紧急情况

**Independent Test**: 可独立测试家属通知发送功能

**Acceptance Scenarios**:

1. **Given** 老人触发SOS，**When** 系统发送通知，**Then** 紧急联系人收到推送消息（含老人位置）
2. **Given** 紧急联系人的手机号无法接通，**Then** 系统自动尝试联系备用联系人
3. **Given** 所有紧急联系人都无法联系，**Then** 系统记录呼叫失败日志

---

### User Story 3 - 拨打120急救电话 (Priority: P1)

王大爷确认SOS后，页面显示"点击拨打120"按钮。由于微信小程序限制，需要用户主动点击拨打。

**Why this priority**: 紧急情况下需要快速拨打120，但微信限制自动拨号，必须提供便捷拨打入口

**Independent Test**: 可独立测试120拨打入口功能

**Acceptance Scenarios**:

1. **Given** 老人触发SOS并确认，**When** 页面显示拨打120按钮，**Then** 点击后调用系统电话拨打界面
2. **Given** 老人不会拨打120，**When** 系统提供"请帮我拨打120"语音引导，**Then** 老人按照引导完成拨打

---

### User Story 4 - 紧急情况位置共享 (Priority: P1)

王大爷在小区花园突然摔倒，触发了SOS。系统自动获取并保存了老人的GPS位置，发送给家属和急救中心。

**Why this priority**: 位置信息是紧急救援的关键，能大大缩短救援时间

**Independent Test**: 可独立测试位置获取和共享功能

**Acceptance Scenarios**:

1. **Given** 老人触发SOS，**When** 系统获取位置，**Then** 位置信息保存到呼叫记录
2. **Given** 老人位置获取失败，**Then** 显示"位置获取中"并继续呼叫流程
3. **Given** 家属查看SOS事件，**Then** 看到老人的具体位置（地图展示）

---

### User Story 5 - SOS记录查看 (Priority: P2)

王大爷的儿子小王想查看父亲之前是否有触发过SOS。他打开家属端的SOS记录页面，看到历史记录列表。

**Why this priority**: 家属需要了解老人的安全事件历史，评估风险

**Independent Test**: 可独立测试SOS历史记录查看

**Acceptance Scenarios**:

1. **Given** 家属进入SOS记录页面，**Then** 显示按时间倒序的SOS事件列表
2. **Given** 家属点击某条记录，**Then** 显示详细信息（时间、地点、响应情况）

---

### User Story 6 - 老人端查看SOS记录 (Priority: P3)

王大爷想看看自己之前触发过的SOS记录。他在小程序中查看自己的SOS历史。

**Why this priority**: 老人有权查看自己的紧急呼叫历史

**Independent Test**: 可独立测试老人端SOS历史查看

**Acceptance Scenarios**:

1. **Given** 老人进入SOS记录页面，**Then** 显示SOS事件列表
2. **Given** 老人查看详情，**Then** 了解每次事件的处理情况

---

### User Story 7 - 社区端接收SOS告警 (Priority: P1)

王大爷触发SOS后，社区养老服务中心收到了紧急告警。张主任立即安排志愿者上门查看。

**Why this priority**: 社区是老人紧急情况的第一响应方

**Independent Test**: 可独立测试社区端SOS接收功能

**Acceptance Scenarios**:

1. **Given** 老人触发SOS，**When** 社区端收到告警，**Then** 显示紧急事件列表
2. **Given** 社区工作者处理事件，**When** 安排志愿者上门，**Then** 记录处理过程
3. **Given** 事件解决，**Then** 标记事件完成，生成事件报告

---

### Edge Cases

- 老人误触SOS如何处理？→提供5秒倒计时取消，确认是真实紧急情况
- 紧急联系人电话为空如何处理？→提示先设置紧急联系人
- 老人的手机没有GPS如何处理？→通过IP地址粗略定位，并在页面说明
- SOS触发时网络中断如何处理？→显示网络异常提醒，使用短信备用通道
- 多个SOS连续触发如何处理？→30分钟内只触发一次，避免骚扰

---

## Requirements

### Functional Requirements

- **FR-001**: 系统 MUST 在小程序首页提供巨大的SOS按钮（占据屏幕30%以上）
- **FR-002**: 系统 MUST 支持SOS触发前5秒倒计时取消
- **FR-003**: 系统 MUST 在SOS触发后立即通知所有紧急联系人
- **FR-004**: 系统 MUST 在SOS触发后显示拨打120入口（需用户主动点击）
- **FR-005**: 系统 MUST 在SOS触发时自动获取并保存老人位置
- **FR-006**: 系统 MUST 将老人位置和健康档案摘要发送给紧急联系人
- **FR-007**: 系统 MUST 记录每次SOS事件详情（时间、地点、响应情况）
- **FR-008**: 系统 MUST 支持家属查看SOS历史记录
- **FR-009**: 系统 MUST 支持紧急联系人无法联系时的备用联系人机制
- **FR-010**: 系统 MUST 对SOS事件进行防抖处理（30分钟内不重复触发）
- **FR-011**: 系统 MUST 支持老人在老人端查看SOS历史记录
- **FR-012**: 系统 MUST 支持社区端接收SOS紧急告警并处理

### Key Entities

- **SOS事件**: 关联用户、触发时间、位置坐标、事件状态（进行中/已解决/已取消）、处理记录
- **紧急联系人通知记录**: 关联SOS事件、联系人、通知时间、响应状态（已查看/未查看）
- **SOS设置**: 关联用户、防抖时间设置、位置共享开关

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: SOS按钮点击到通知发送的延迟不超过3秒
- **SC-002**: 99%以上的SOS通知送达紧急联系人（网络正常情况下）
- **SC-003**: 位置获取成功率达到90%以上
- **SC-004**: 家属对SOS响应时效的满意度达到90%以上
- **SC-005**: SOS误触率低于5%（通过5秒倒计时取消）
- **SC-006**: 社区端SOS响应时间不超过15分钟

---

## Assumptions

- 假设SOS触发时优先通知第一个紧急联系人，然后依次通知其他联系人
- 假设位置获取采用小程序wx.getLocation API，需要用户授权
- 假设120拨打采用wx.makePhoneCall，需要用户确认后拨打
- 假设通知采用微信服务通知+短信双通道（短信为付费备选）
- 假设每次SOS事件会持续跟进直到家属确认老人安全

---

## Clarifications

### Session 2025-07-18

- Q: 紧急联系人通知顺序 → A: 同步通知所有联系人，同时发送
- Q: 社区端SOS响应流程 → A: 15分钟内响应上门

---

## Assumptions
