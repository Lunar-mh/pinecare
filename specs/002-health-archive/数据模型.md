# Data Model: 全维健康档案基础版

## 实体定义

### 1. 健康档案 (HealthArchive)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 档案ID |
| user_id | BIGINT | FK -> User(id) | 所属用户 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**Relationships**:
- 一对多: HealthArchive -> HealthRecord

---

### 2. 健康指标记录 (HealthRecord)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 记录ID |
| user_id | BIGINT | FK -> User(id) | 所属用户 |
| metric_type | ENUM('blood_pressure','heart_rate','blood_oxygen','steps','sleep','blood_sugar','temperature') | NOT NULL | 指标类型 |
| value | VARCHAR(64) | NOT NULL | 指标值(JSON格式) |
| value_high | INT | NULL | 收缩压/最高值 |
| value_low | INT | NULL | 舒张压/最低值 |
| source | ENUM('device','manual') | DEFAULT 'device' | 数据来源 |
| device_id | BIGINT | FK -> DeviceBinding(id), NULL | 设备ID |
| measured_at | DATETIME | NOT NULL | 测量时间 |
| synced_at | DATETIME | NOT NULL | 同步时间 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 记录时间 |

**Indexes**:
- INDEX(user_id, metric_type, measured_at)
- INDEX(user_id, measured_at)

**Relationships**:
- 多对一: HealthRecord -> User
- 多对一: HealthRecord -> DeviceBinding

---

### 3. 设备绑定关系 (DeviceBinding)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 设备ID |
| user_id | BIGINT | FK -> User(id) | 所属用户 |
| device_name | VARCHAR(64) | NOT NULL | 设备名称 |
| device_mac | VARCHAR(17) | NULL | 设备MAC地址 |
| device_type | VARCHAR(32) | NOT NULL | 设备类型(手环/手表) |
| is_primary | TINYINT | DEFAULT 0 | 是否为主设备 |
| battery_level | TINYINT | NULL | 电量百分比 |
| bind_status | ENUM('bound','unbound') | DEFAULT 'bound' | 绑定状态 |
| last_sync_at | DATETIME | NULL | 最后同步时间 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 绑定时间 |
| updated_at | DATETIME | ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**Indexes**:
- INDEX(user_id, bind_status)

---

### 4. 设备数据缓存 (DeviceDataCache)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| device_id | BIGINT | FK -> DeviceBinding(id) | 设备ID |
| data_type | VARCHAR(32) | NOT NULL | 数据类型 |
| data_content | JSON | NOT NULL | 数据内容 |
| received_at | DATETIME | NOT NULL | 接收时间 |
| expires_at | DATETIME | NOT NULL | 过期时间 |

**Indexes**:
- INDEX(device_id, data_type)

---

## 状态转换

### 设备绑定状态

```
bound (已绑定)
    ↓ (用户解绑)
unbound (已解绑)
```

---

## 验证规则

| 字段 | 验证规则 |
|------|----------|
| blood_pressure.value | 格式: "收缩压/舒张压"，如 "120/80" |
| heart_rate.value | 数值: 30-250 次/分 |
| blood_oxygen.value | 数值: 50-100% |
| steps.value | 数值: 0-100000 步 |
| blood_sugar.value | 数值: 1.0-30.0 mmol/L |

---

## 健康指标正常范围

| 指标类型 | 正常范围 | 异常阈值 |
|----------|----------|----------|
| 血压 | 收缩压 <140mmHg, 舒张压 <90mmHg | ≥140/90mmHg |
| 心率 | 60-100 次/分 | <60 或 >100 |
| 血氧 | 95-100% | <95% |
| 睡眠 | ≥6小时 | <4小时 |
