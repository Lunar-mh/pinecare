# Feature Specification: 社区端管理后台

**Feature Branch**: `013-community-admin`  
**Created**: 2025-07-18  
**Status**: Draft  
**Input**: 银伴平台功能 - 社区工作者管理后台，志愿者管理、服务调度、数据统计

---

## User Scenarios & Testing

### User Story 1 - 社区工作者登录 (Priority: P1)

张主任是社区养老服务中心的负责人。他打开社区管理后台，使用账号密码登录。

**Why this priority**: 社区管理后台是社区工作者使用平台的入口

**Independent Test**: 可独立测试登录功能

**Acceptance Scenarios**:

1. **Given** 社区工作者进入管理后台，**When** 输入账号密码，**Then** 登录成功
2. **Given** 登录失败，**Then** 显示错误提示，允许重试
3. **Given** 首次登录，**When** 要求修改初始密码，**Then** 修改后正常使用

---

### User Story 2 - 辖区老人数据查看 (Priority: P1)

张主任想了解辖区内的老人情况。他打开数据看板，看到注册老人数量、健康数据统计、异常告警列表。

**Why this priority**: 社区需要掌握辖区老人的基本情况

**Independent Test**: 可独立测试数据看板功能

**Acceptance Scenarios**:

1. **Given** 社区工作者进入首页，**When** 查看数据看板，**Then** 显示辖区老人数量、健康状态分布、活跃度等
2. **Given** 查看详情，**When** 点击某一指标，**Then** 进入详情页面
3. **Given** 数据每日更新，**Then** 显示数据更新时间

---

### User Story 3 - 志愿者管理 (Priority: P1)

张主任需要管理辖区的志愿者。他看到志愿者列表，可以查看信息、分配任务、处理投诉。

**Why this priority**: 志愿者是社区服务的核心供给方

**Independent Test**: 可独立测试志愿者管理功能

**Acceptance Scenarios**:

1. **Given** 社区工作者进入志愿者管理，**When** 查看志愿者列表，**Then** 显示志愿者基本信息、服务时长、评分
2. **Given** 需要添加志愿者，**When** 输入志愿者信息，**Then** 添加成功
3. **Given** 志愿者被投诉，**When** 查看投诉详情，**Then** 可以进行处理

---

### User Story 4 - 服务工单调度 (Priority: P1)

王大爷发布了陪诊需求。张主任在后台看到工单，根据志愿者位置和技能进行派单。

**Why this priority**: 服务调度是社区端的核心功能

**Independent Test**: 可独立测试服务工单功能

**Acceptance Scenarios**:

1. **Given** 有新的服务工单，**When** 进入工单管理，**Then** 显示待处理工单列表
2. **Given** 派单给志愿者，**When** 选择合适的志愿者，**Then** 工单分配成功
3. **Given** 工单完成，**When** 双方确认，**Then** 工单状态更新

---

### User Story 5 - 紧急事件处理 (Priority: P1)

王大爷触发了SOS。张主任在后台收到紧急告警，立即安排志愿者上门查看。

**Why this priority**: 紧急事件需要快速响应

**Independent Test**: 可独立测试紧急事件处理功能

**Acceptance Scenarios**:

1. **Given** 老人触发SOS，**When** 社区收到紧急告警，**Then** 显示紧急事件列表
2. **Given** 张主任处理事件，**When** 安排志愿者上门，**Then** 记录处理过程
3. **Given** 事件解决，**When** 标记事件完成，**Then** 生成事件报告

---

### User Story 6 - 时间银行运营 (Priority: P2)

张主任需要管理时间银行的运营。他可以看到时间币的发行量、兑换情况、志愿者服务统计。

**Why this priority**: 社区需要掌握时间银行的运营状况

**Independent Test**: 可独立测试时间银行运营功能

**Acceptance Scenarios**:

1. **Given** 进入时间银行管理，**When** 查看运营数据，**Then** 显示时间币发行量、服务时长统计
2. **Given** 有异常情况（如时间币滥用），**Then** 可以进行处理
3. **Given** 需要导出数据，**Then** 支持Excel导出

---

### User Story 7 - 数据统计与报表 (Priority: P2)

张主任需要向上级汇报工作。他生成月度报表，包含服务次数、老人满意度、志愿者活跃度等。

**Why this priority**: 数据报表是社区工作的重要组成部分

**Independent Test**: 可独立测试数据报表功能

**Acceptance Scenarios**:

1. **Given** 进入数据统计，**When** 选择时间范围，**Then** 生成统计报表
2. **Given** 报表包含图表，**Then** 支持可视化展示
3. **Given** 需要导出，**Then** 支持PDF和Excel格式导出

---

### Edge Cases

- 多个社区如何处理数据隔离？→按社区ID隔离，仅能看到本社区数据
- 社区工作者权限如何管理？→支持多级权限（主任/专员/志愿者）
- 数据如何保证准确性？→与老人端数据实时同步
- 系统崩溃如何处理？→数据自动备份，支持恢复

---

## Requirements

### Functional Requirements

- **FR-001**: 系统 MUST 支持社区工作者账号登录管理后台
- **FR-002**: 系统 MUST 显示辖区老人数据看板（数量、健康状态、活跃度）
- **FR-003**: 系统 MUST 支持志愿者信息管理（添加、编辑、查看、禁用）
- **FR-004**: 系统 MUST 支持服务工单的接收、派单、跟踪、完成
- **FR-005**: 系统 MUST 对SOS紧急事件进行实时告警和快速响应
- **FR-006**: 系统 MUST 支持时间银行运营数据查看和管理
- **FR-007**: 系统 MUST 支持数据统计和报表生成（支持导出）
- **FR-008**: 系统 MUST 支持多级权限管理
- **FR-009**: 系统 MUST 按社区进行数据隔离
- **FR-010**: 系统 MUST 记录所有操作日志，支持审计

### Key Entities

- **社区账户**: 账户ID、所属社区、角色、权限、登录信息
- **服务工单**: 工单ID、需求方、服务类型、状态、派单志愿者、处理时间
- **志愿者管理**: 关联社区、志愿者信息、服务统计、评分、状态
- **紧急事件**: 事件ID、触发来源、处理状态、处理人、处理结果、结束时间
- **运营报表**: 报表ID、类型、时间范围、数据内容、生成时间

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: 社区工作者登录成功率达到99%以上
- **SC-002**: 服务工单24小时内处理完成率达到90%以上
- **SC-003**: SOS紧急事件响应时间不超过15分钟
- **SC-004**: 数据看板更新延迟不超过5分钟
- **SC-005**: 社区工作者对管理后台满意度达到4分以上（5分制）

---

## Assumptions

- 假设管理后台采用Web端（PC浏览器访问）
- 假设一个社区可有多个管理账户
- 假设工单派单支持手动和自动两种模式
- 假设SOS紧急事件同时通知社区和家属
- 假设报表默认显示本月数据，支持自定义时间范围
