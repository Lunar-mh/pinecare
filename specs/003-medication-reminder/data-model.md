# Data Model: 智慧用药提醒

## 实体定义

### 1. 用药计划 (MedicationPlan)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 计划ID |
| user_id | BIGINT | FK -> User(id) | 所属用户 |
| medication_name | VARCHAR(128) | NOT NULL | 药品名称 |
| dosage | VARCHAR(64) | NOT NULL | 剂量(如1片) |
| frequency | ENUM('once_daily','twice_daily','three_times','as_needed') | NOT NULL | 频率 |
| remind_times | JSON | NOT NULL | 提醒时间列表 |
| start_date | DATE | NOT NULL | 开始日期 |
| end_date | DATE | NULL | 结束日期(无限期为NULL) |
| remaining_quantity | INT | NULL | 剩余数量 |
| reminder_threshold | INT | DEFAULT 3 | 续药提醒阈值(天) |
| is_active | TINYINT | DEFAULT 1 | 是否启用 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**Indexes**:
- INDEX(user_id, is_active)

---

### 2. 服药记录 (MedicationLog)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 记录ID |
| user_id | BIGINT | FK -> User(id) | 所属用户 |
| plan_id | BIGINT | FK -> MedicationPlan(id) | 用药计划ID |
| scheduled_time | DATETIME | NOT NULL | 计划服药时间 |
| actual_time | DATETIME | NULL | 实际服药时间 |
| status | ENUM('pending','taken','missed','skipped') | DEFAULT 'pending' | 状态 |
| reminder_sent | TINYINT | DEFAULT 0 | 是否已发送提醒 |
| second_reminder_sent | TINYINT | DEFAULT 0 | 是否已发送二次提醒 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**Indexes**:
- INDEX(user_id, scheduled_time)
- INDEX(plan_id, scheduled_time)

---

### 3. 用药提醒设置 (MedicationSettings)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| user_id | BIGINT | FK -> User(id), UNIQUE | 所属用户 |
| reminder_enabled | TINYINT | DEFAULT 1 | 提醒开关 |
| family_sync_enabled | TINYINT | DEFAULT 0 | 家属同步开关 |
| sleep_start | TIME | DEFAULT '22:00:00' | 睡眠开始时间 |
| sleep_end | TIME | DEFAULT '06:00:00' | 睡眠结束时间 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

---

### 4. 提醒任务队列 (ReminderQueue)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 任务ID |
| user_id | BIGINT | NOT NULL | 用户ID |
| plan_id | BIGINT | FK -> MedicationPlan(id) | 用药计划ID |
| log_id | BIGINT | FK -> MedicationLog(id) | 服药记录ID |
| remind_type | ENUM('first','second','family') | NOT NULL | 提醒类型 |
| scheduled_at | DATETIME | NOT NULL | 计划发送时间 |
| sent_at | DATETIME | NULL | 实际发送时间 |
| status | ENUM('pending','sent','failed') | DEFAULT 'pending' | 状态 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**Indexes**:
- INDEX(status, scheduled_at)

---

## 状态转换

### 服药记录状态

```
pending (待服药)
    ↓ (用户确认)
taken (已服用)
    ↓
完成

pending (待服药)
    ↓ (30分钟未确认)
pending + 发送二次提醒
    ↓ (2小时未确认)
missed (已错过) + 通知家属
```

---

## 验证规则

| 字段 | 验证规则 |
|------|----------|
| medication_name | 必填，最长128字符 |
| dosage | 必填，如"1片"、"2粒" |
| remind_times | JSON数组，如["08:00","20:00"] |
| remaining_quantity | 整数，≥0 |
