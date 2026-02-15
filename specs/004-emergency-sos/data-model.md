# Data Model: 一键紧急救援

## 实体定义

### 1. SOS事件表 (SosEvent)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 事件ID |
| user_id | BIGINT | FK -> User(id) | 触发用户 |
| trigger_type | ENUM('manual','auto') | DEFAULT 'manual' | 触发类型 |
| latitude | DECIMAL(10,7) | NULL | 纬度 |
| longitude | DECIMAL(10,7) | NULL | 经度 |
| address | VARCHAR(256) | NULL | 地址名称 |
| event_status | ENUM('triggered','confirmed','resolved','cancelled') | DEFAULT 'triggered' | 事件状态 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 触发时间 |
| resolved_at | DATETIME | NULL | 解决时间 |

---

### 2. SOS通知记录表 (SosNotification)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| sos_event_id | BIGINT | FK -> SosEvent(id) | SOS事件ID |
| contact_id | BIGINT | FK -> EmergencyContact(id) | 紧急联系人ID |
| notify_type | ENUM('wechat','sms') | NOT NULL | 通知类型 |
| sent_at | DATETIME | NULL | 发送时间 |
| status | ENUM('pending','sent','failed') | DEFAULT 'pending' | 状态 |

---

## 状态转换

```
triggered (已触发)
    ↓ (确认/解决)
confirmed (已确认)
    ↓
resolved (已解决)
    ↓ (用户取消)
cancelled (已取消)
```
