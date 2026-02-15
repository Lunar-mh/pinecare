# Data Model: 用户注册与身份认证

## 实体定义

### 1. 用户账户 (User)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 用户ID |
| phone | VARCHAR(11) | UNIQUE, NULL | 手机号 |
| openid | VARCHAR(128) | UNIQUE, NULL | 微信openid |
| nickname | VARCHAR(64) | NULL | 昵称 |
| avatar_url | VARCHAR(512) | NULL | 头像URL |
| real_name | VARCHAR(64) | NULL | 真实姓名 |
| age | TINYINT | NULL | 年龄 |
| gender | ENUM('male','female','unknown') | DEFAULT 'unknown' | 性别 |
| chronic_diseases | JSON | NULL | 慢性病列表 |
| password_hash | VARCHAR(128) | NULL | 密码哈希(bcrypt) |
| account_status | ENUM('active','locked','deleted') | DEFAULT 'active' | 账户状态 |
| failed_login_attempts | INT | DEFAULT 0 | 连续登录失败次数 |
| locked_until | DATETIME | NULL | 账户锁定截止时间 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | ON UPDATE CURRENT_TIMESTAMP | 更新时间 |
| last_login_at | DATETIME | NULL | 最后登录时间 |

**Relationships**:
- 一对多: User -> EmergencyContact (紧急联系人)
- 一对多: User -> FamilyBinding (家属绑定)
- 一对多: User -> HealthRecord (健康档案)

---

### 2. 紧急联系人 (EmergencyContact)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| user_id | BIGINT | FK -> User(id) | 所属用户 |
| name | VARCHAR(64) | NOT NULL | 联系人姓名 |
| phone | VARCHAR(11) | NOT NULL | 联系电话 |
| relationship | VARCHAR(32) | NOT NULL | 与用户关系 |
| is_primary | TINYINT | DEFAULT 0 | 是否为主要联系人 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**Relationships**:
- 多对一: EmergencyContact -> User

---

### 3. 家属绑定关系 (FamilyBinding)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| elder_user_id | BIGINT | FK -> User(id) | 老人账户 |
| family_user_id | BIGINT | FK -> User(id) | 家属账户 |
| binding_status | ENUM('pending','approved','rejected') | DEFAULT 'pending' | 绑定状态 |
| qr_code | VARCHAR(128) | NULL | 绑定二维码ID |
| qr_expired_at | DATETIME | NULL | 二维码过期时间 |
| approved_at | DATETIME | NULL | 同意时间 |
| rejected_at | DATETIME | NULL | 拒绝时间 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**Indexes**:
- UNIQUE(elder_user_id, family_user_id)

**Relationships**:
- 多对一: FamilyBinding -> User (elder)
- 多对一: FamilyBinding -> User (family)

---

### 4. 短信验证码记录 (SmsCode)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| phone | VARCHAR(11) | NOT NULL | 手机号 |
| code | VARCHAR(6) | NOT NULL | 验证码 |
| purpose | ENUM('register','login','bind','reset_password') | NOT NULL | 用途 |
| used | TINYINT | DEFAULT 0 | 是否已使用 |
| expires_at | DATETIME | NOT NULL | 过期时间 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**Indexes**:
- INDEX(phone, purpose, created_at)

---

### 5. 账户操作日志 (AuditLog)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| user_id | BIGINT | FK -> User(id), NULL | 用户ID |
| action | VARCHAR(32) | NOT NULL | 操作类型 |
| ip_address | VARCHAR(45) | NULL | IP地址 |
| user_agent | VARCHAR(512) | NULL | 用户代理 |
| details | JSON | NULL | 详细信息 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**Indexes**:
- INDEX(user_id, created_at)

---

## 状态转换

### 用户账户状态

```
active (正常) 
    ↓ (连续5次登录失败)
locked (锁定30分钟)
    ↓ (解锁/30分钟到期)
active
    ↓ (用户注销)
deleted (永久删除)
```

### 家属绑定状态

```
pending (待确认)
    ↓ (老人同意)
approved (已绑定)
    ↓ (老人拒绝/解绑)
rejected (已拒绝)
```

---

## 验证规则

| 字段 | 验证规则 |
|------|----------|
| phone | 11位手机号，中国大陆格式 |
| code | 6位数字验证码 |
| password | 至少8位，含大小写字母和数字 |
| emergency_contact.phone | 11位手机号 |
| 验证码频率 | 每手机号每天最多10次 |
