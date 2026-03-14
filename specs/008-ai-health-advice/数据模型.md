# Data Model: AI健康顾问

## 实体定义

### 1. 咨询记录 (ConsultRecord)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| user_id | BIGINT | FK -> User(id) | 用户ID |
| session_id | VARCHAR(64) | NOT NULL | 会话ID（用于多轮对话） |
| role | ENUM('user','assistant') | NOT NULL | 角色 |
| content | TEXT | NOT NULL | 对话内容 |
| tokens | INT | NULL | token消耗 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**Indexes**:
- INDEX(user_id, session_id)
- INDEX(user_id, created_at)

---

### 2. 健康画像 (HealthProfile)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| user_id | BIGINT | FK -> User(id) | 用户ID |
| age | TINYINT | NULL | 年龄 |
| gender | ENUM('male','female') | NULL | 性别 |
| chronic_diseases | JSON | NULL | 慢性病列表 |
| allergies | JSON | NULL | 过敏史 |
| recent_indicators | JSON | NULL | 最近健康指标 |
| current_medications | JSON | NULL | 当前用药 |
| updated_at | DATETIME | ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**Indexes**:
- UNIQUE(user_id)

---

### 3. 敏感内容记录 (SensitiveRecord)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| user_id | BIGINT | FK -> User(id) | 用户ID |
| content | TEXT | NOT NULL | 原始内容 |
| risk_type | VARCHAR(32) | NOT NULL | 风险类型 |
| risk_level | ENUM('low','medium','high') | NOT NULL | 风险等级 |
| handled | TINYINT | DEFAULT 0 | 是否已处理 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**Indexes**:
- INDEX(user_id, risk_level)
- INDEX(user_id, created_at)

---

## 验证规则

| 字段 | 验证规则 |
|------|----------|
| content | 最大2000字符 |
| session_id | UUID格式 |
| tokens | 正整数 |
