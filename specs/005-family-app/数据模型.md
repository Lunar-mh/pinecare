# Data Model: 家属端基础功能

## 实体定义

### 1. 家属账户 (FamilyUser)

与用户表关联，通过family_bindings表绑定老人账户。

### 2. 通知设置 (NotificationSettings)

| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | BIGINT | 家属ID |
| alert_enabled | TINYINT | 异常预警开关 |
| medication_enabled | TINYINT | 用药提醒开关 |
| sos_enabled | TINYINT | SOS通知开关 |
