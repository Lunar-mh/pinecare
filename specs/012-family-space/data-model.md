# Data Model: 家庭空间

## 实体定义

### 1. 语音留言 (VoiceMessage)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| from_user_id | BIGINT | FK -> User(id) | 发送者 |
| to_user_id | BIGINT | FK -> User(id) | 接收者 |
| audio_url | VARCHAR(512) | NOT NULL | 音频URL |
| duration_seconds | INT | NOT NULL | 时长 |
| is_played | TINYINT | DEFAULT 0 | 已播放 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

---

### 2. 家庭相册 (FamilyAlbum)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| family_id | BIGINT | NOT NULL | 家庭ID |
| photo_url | VARCHAR(512) | NOT NULL | 照片URL |
| description | VARCHAR(256) | NULL | 描述 |
| taken_at | DATETIME | NULL | 拍摄时间 |
| uploaded_by | BIGINT | FK -> User(id) | 上传者 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

---

### 3. 孝心值记录 (FamilyPoints)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| user_id | BIGINT | FK -> User(id) | 用户ID |
| points | INT | NOT NULL | 积分变动 |
| action_type | VARCHAR(32) | NOT NULL | 行为类型 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
