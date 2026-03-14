# Data Model: GPS定位追踪

## 实体定义

### 1. 位置记录 (LocationRecord)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| user_id | BIGINT | FK -> User(id) | 用户ID |
| latitude | DECIMAL(10,7) | NOT NULL | 纬度 |
| longitude | DECIMAL(10,7) | NOT NULL | 经度 |
| accuracy | FLOAT | NULL | 精度(米) |
| location_type | ENUM('gps','wifi','基站') | DEFAULT 'gps' | 定位类型 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

---

### 2. 电子围栏 (GeoFence)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| user_id | BIGINT | FK -> User(id) | 用户ID |
| name | VARCHAR(64) | NOT NULL | 围栏名称 |
| fence_type | ENUM('circle','polygon') | NOT NULL | 围栏类型 |
| center_lat | DECIMAL(10,7) | NULL | 中心纬度 |
| center_lng | DECIMAL(10,7) | NULL | 中心经度 |
| radius | INT | NULL | 半径(米) |
| alert_type | ENUM('enter','exit','both') | DEFAULT 'both' | 告警类型 |
| is_active | TINYINT | DEFAULT 1 | 是否启用 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

---

### 3. 围栏告警 (FenceAlert)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| fence_id | BIGINT | FK -> GeoFence(id) | 围栏ID |
| user_id | BIGINT | FK -> User(id) | 用户ID |
| alert_type | ENUM('enter','exit') | NOT NULL | 告警类型 |
| latitude | DECIMAL(10,7) | NOT NULL | 告警位置纬度 |
| longitude | DECIMAL(10,7) | NOT NULL | 告警位置经度 |
| is_handled | TINYINT | DEFAULT 0 | 是否处理 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
