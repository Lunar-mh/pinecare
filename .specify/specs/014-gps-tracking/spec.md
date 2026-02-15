# Feature Specification: GPS定位与轨迹

**Feature Branch**: `014-gps-tracking`  
**Created**: 2025-07-18  
**Status**: Draft  
**Input**: 银伴平台功能 - 老人位置实时获取、历史轨迹查看、范围告警

---

## User Scenarios & Testing

### User Story 1 - 实时位置查看 (Priority: P1)

小王想看看父亲现在在哪里。他打开家属端，点击"查看位置"，看到父亲当前在小区花园。

**Why this priority**: 实时位置是家属远程看护的重要信息

**Independent Test**: 可独立测试实时位置查看功能

**Acceptance Scenarios**:

1. **Given** 家属进入位置页面，**When** 点击查看实时位置，**Then** 显示老人当前位置（地图）
2. **Given** 位置获取成功，**Then** 显示具体地址名称
3. **Given** 位置获取失败，**Then** 显示错误提示，允许重试

---

### User Story 2 - 历史轨迹查看 (Priority: P1)

小王想看看父亲今天的活动轨迹。他点击"轨迹记录"，看到父亲从家到菜市场再到公园的路线。

**Why this priority**: 轨迹反映老人日常活动模式

**Independent Test**: 可独立测试历史轨迹功能

**Acceptance Scenarios**:

1. **Given** 家属进入轨迹页面，**When** 选择日期，**Then** 显示当天活动轨迹
2. **Given** 轨迹在地图上展示，**Then** 显示行动路线和停留点
3. **Given** 停留时间过长，**Then** 标注为"长时间停留"

---

### User Story 3 - 离开范围告警 (Priority: P1)

王大爷离开了平时活动的范围（家附近500米），系统自动给家属发送了告警通知。

**Why this priority**: 及时发现老人异常离开

**Independent Test**: 可独立测试范围告警功能

**Acceptance Scenarios**:

1. **Given** 老人位置超出设置范围，**When** 系统检测到，**Then** 发送告警通知给家属
2. **Given** 家属收到告警，**Then** 点击可查看老人当前位置和轨迹
3. **Given** 老人回到范围内，**Then** 发送"已返回"通知

---

### User Story 4 - 位置共享设置 (Priority: P2)

王大爷不想一直被家人定位。他设置了位置共享时间段：只在早上8点到晚上8点共享。

**Why this priority**: 尊重老人隐私，避免过度监控

**Independent Test**: 可独立测试位置共享设置功能

**Acceptance Scenarios**:

1. **Given** 老人进入位置设置，**When** 设置共享时间段，**Then** 保存成功
2. **Given** 超出共享时间，**When** 家属查看位置，**Then** 显示"暂不共享"
3. **Given** 老人可以随时开启或关闭位置共享，**Then** 实时生效

---

### User Story 5 - 紧急定位 (Priority: P1)

王大爷触发SOS后，系统自动获取并保存了他的位置，发送给家属和急救中心。

**Why this priority**: 紧急情况下的位置是救援的关键

**Independent Test**: 可独立测试紧急定位功能

**Acceptance Scenarios**:

1. **Given** 老人触发SOS，**When** 系统自动获取位置，**Then** 位置保存到事件记录
2. **Given** 家属查看SOS事件，**Then** 看到老人的位置（地图展示）
3. **Given** 急救中心需要位置，**Then** 可导出位置信息

---

### Edge Cases

- GPS信号弱如何处理？→显示"定位中"，尝试多次获取
- 老人手机没电如何处理？→最后位置保留，显示"最后在线时间"
- 老人关闭了位置权限如何处理？→提醒开启权限，否则无法使用定位功能
- 位置数据如何保护？→加密存储，仅家属可见
- 轨迹数据保留多久？→默认保留30天，可设置

---

## Requirements

### Functional Requirements

- **FR-001**: 系统 MUST 支持家属查看老人实时位置（需老人授权）
- **FR-002**: 系统 MUST 支持查看老人历史活动轨迹（按日期）
- **FR-003**: 系统 MUST 支持设置电子围栏范围（家/社区/自定义）
- **FR-004**: 系统 MUST 在老人离开设置范围时自动告警家属
- **FR-005**: 系统 MUST 支持老人设置位置共享时间段
- **FR-006**: 系统 MUST 在SOS触发时自动获取并保存位置
- **FR-007**: 系统 MUST 保护位置隐私，仅授权家属可见
- **FR-008**: 系统 MUST 记录位置数据，支持轨迹回放
- **FR-009**: 系统 MUST 支持导出SOS事件中的位置信息
- **FR-010**: 系统 MUST 在老人位置异常时提供多重确认机制

### Key Entities

- **位置记录**: 关联用户、经纬度、地址、定位时间、定位来源（GPS/WiFi）
- **轨迹记录**: 关联用户、日期、位置列表、停留点列表
- **电子围栏**: 关联用户、围栏中心坐标、半径、告警开关、状态
- **位置共享设置**: 关联用户、共享开关、共享时间段、授权家属列表

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: 实时位置获取成功率达到90%以上
- **SC-002**: 位置更新延迟不超过30秒
- **SC-003**: 电子围栏告警准确率达到95%以上
- **SC-004**: 轨迹数据完整率（无中断）达到90%以上
- **SC-005**: 家属对位置功能满意度达到4分以上（5分制）

---

## Assumptions

- 假设GPS定位依赖小程序wx.getLocation API，需要用户授权
- 假设连续定位会增加电量消耗，建议采用"按需获取+定时刷新"模式
- 假设室内定位采用WiFi定位辅助
- 假设电子围栏默认半径500米，可自定义（100米-5公里）
- 假设位置数据存储采用经纬度，查询时转换为地址名称显示
- 假设轨迹数据保留30天

---

## Clarifications

### Session 2025-07-18

- Q: 轨迹数据保留期限 → A: 保留30天

---

## Assumptions
