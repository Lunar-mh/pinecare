# Data Model: 时间银行

## 实体定义

### 1. 时间币账户 (TimeAccount)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| user_id | BIGINT | FK -> User(id) | 用户ID |
| balance | INT | DEFAULT 0 | 当前余额 |
| total_earned | INT | DEFAULT 0 | 累计赚取 |
| total_spent | INT | DEFAULT 0 | 累计消费 |
| credit_score | INT | DEFAULT 100 | 信用评分 |
| credit_level | ENUM('new','silver','gold','angel') | DEFAULT 'new' | 信用级别 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**Indexes**:
- UNIQUE(user_id)

---

### 2. 服务记录 (ServiceRecord)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| record_hash | VARCHAR(64) | UNIQUE | 记录哈希 |
| prev_hash | VARCHAR(64) | NOT NULL | 前序哈希 |
| provider_id | BIGINT | FK -> User(id) | 服务者ID |
| recipient_id | BIGINT | FK -> User(id) | 被服务者ID |
| service_type | VARCHAR(32) | NOT NULL | 服务类型 |
| start_time | DATETIME | NOT NULL | 开始时间 |
| end_time | DATETIME | NOT NULL | 结束时间 |
| duration_hours | DECIMAL(3,1) | NOT NULL | 时长 |
| time_coins | INT | NOT NULL | 时间币数量 |
| location_hash | VARCHAR(64) | NULL | 位置哈希 |
| status | ENUM('pending','confirmed','cancelled') | DEFAULT 'pending' | 状态 |
| provider_signature | VARCHAR(256) | NULL | 服务者签名 |
| recipient_signature | VARCHAR(256) | NULL | 被服务者签名 |
| platform_signature | VARCHAR(256) | NULL | 平台签名 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**Indexes**:
- INDEX(provider_id, status)
- INDEX(recipient_id, status)
- INDEX(record_hash)

---

### 3. 兑换记录 (ExchangeRecord)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| user_id | BIGINT | FK -> User(id) | 用户ID |
| exchange_type | ENUM('service','goods','medical','donation') | NOT NULL | 兑换类型 |
| item_name | VARCHAR(128) | NOT NULL | 兑换物品 |
| coins_required | INT | NOT NULL | 所需时间币 |
| status | ENUM('pending','completed','cancelled') | DEFAULT 'pending' | 状态 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| completed_at | DATETIME | NULL | 完成时间 |

**Indexes**:
- INDEX(user_id, status)

---

## 验证规则

| 字段 | 验证规则 |
|------|----------|
| balance | 非负整数 |
| duration_hours | 0.5-8小时 |
| time_coins | 正整数 |
| credit_score | 0-100 |
