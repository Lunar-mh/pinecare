# 数据字典与权限矩阵

## 1. 固定角色字典

| 角色 | 说明 |
|------|------|
| `elder` | 老人端用户 |
| `family` | 家属端用户 |
| `volunteer` | 志愿者端用户 |
| `community_admin` | 社区管理员 |
| `super_admin` | 全局管理员 |

规则：

1. 不允许新增临时角色
2. 不允许用字符串别名替代标准角色

## 2. 关键实体字典

| 实体 | 说明 |
|------|------|
| User | 平台用户主实体 |
| FamilyBinding | 老人与家属绑定关系 |
| EmergencyContact | 紧急联系人 |
| DeviceBinding | 设备绑定关系 |
| HealthRecord | 健康记录 |
| MedicationPlan | 用药计划 |
| MedicationLog | 用药日志 |
| TodayMedicationTask | 今日用药任务 |
| SOSEvent | SOS 事件 |
| SOSNotification | SOS 通知记录 |
| LocationRecord | 定位记录 |
| GeoFence | 安全围栏 |
| FenceAlert | 围栏告警 |
| VolunteerTask | 志愿者任务 |
| VolunteerAttendance | 签到签退 |
| VolunteerTraining | 培训状态 |
| CommunityOrder | 社区工单 |
| CommunityActivity | 社区活动 |
| TimeBankAccount | 时间银行账户 |
| TimeBankServiceRecord | 时间银行服务记录 |
| TimeBankExchangeRecord | 时间银行兑换记录 |
| OnlineConsultation | 在线咨询会话 |
| Appointment | 预约记录 |
| MedicalReport | 医疗报告 |
| AuditLog | 审计日志 |
| DemoScenario | 演示场景 |

## 3. 关键状态字典

### 用药任务状态

1. `pending`
2. `taken`
3. `missed`
4. `skipped`

### SOS 事件状态

1. `triggered`
2. `responding`
3. `resolved`
4. `cancelled`

### 志愿者任务状态

1. `pending`
2. `accepted`
3. `in_progress`
4. `awaiting_confirmation`
5. `completed`
6. `cancelled`

### 时间银行服务状态

1. `open`
2. `accepted`
3. `completed`
4. `cancelled`

### 预约状态

1. `pending`
2. `confirmed`
3. `completed`
4. `cancelled`

规则：

1. 各端 UI 只能消费这些标准状态
2. 新增状态前必须同步更新本文档、后端测试和前端文案映射

## 4. 权限矩阵

| 能力 | elder | family | volunteer | community_admin | super_admin |
|------|-------|--------|-----------|-----------------|-------------|
| 查看本人资料 | 是 | 是 | 是 | 是 | 是 |
| 查看已绑定老人状态 | 否 | 是 | 否 | 按社区 | 是 |
| 维护紧急联系人 | 是 | 部分 | 否 | 否 | 否 |
| 触发 SOS | 是 | 否 | 否 | 否 | 否 |
| 查看 SOS 自己相关事件 | 是 | 是 | 仅协助任务 | 是 | 是 |
| 查看社区全局 SOS | 否 | 否 | 否 | 是 | 是 |
| 查看今日用药任务 | 是 | 是 | 否 | 是 | 是 |
| 确认本人服药 | 是 | 否 | 否 | 否 | 否 |
| 查看家庭空间内容 | 是 | 是 | 否 | 否 | 否 |
| 查看志愿者任务 | 否 | 否 | 是 | 是 | 是 |
| 接单与签到签退 | 否 | 否 | 是 | 否 | 否 |
| 分派志愿者任务 | 否 | 否 | 否 | 是 | 是 |
| 审核时间银行记录 | 否 | 否 | 否 | 是 | 是 |
| 查看后台统计 | 否 | 否 | 否 | 是 | 是 |

## 5. 作用域规则

1. `elder` 只看自己
2. `family` 只看已绑定长辈
3. `volunteer` 只看分配给自己的任务
4. `community_admin` 只看自己社区
5. `super_admin` 可看全局

