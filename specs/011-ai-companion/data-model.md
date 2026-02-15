# Data Model: AI陪伴

## 实体定义

### 1. 陪伴会话记录 (CompanionSession)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| user_id | BIGINT | FK -> User(id) | 用户ID |
| session_type | ENUM('chat','game','nostalgia') | NOT NULL | 会话类型 |
| emotional_state | INT | NULL | 情绪指数(0-100) |
| duration_minutes | INT | NULL | 持续时长 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

---

### 2. 认知游戏记录 (GameRecord)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| user_id | BIGINT | FK -> User(id) | 用户ID |
| game_type | VARCHAR(32) | NOT NULL | 游戏类型 |
| score | INT | NOT NULL | 得分 |
| difficulty | TINYINT | NOT NULL | 难度等级 |
| duration_seconds | INT | NOT NULL | 游戏时长 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

---

### 3. 情绪追踪 (EmotionTrack)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| user_id | BIGINT | FK -> User(id) | 用户ID |
| emotion_score | INT | NOT NULL | 情绪得分 |
| sleep_quality | TINYINT | NULL | 睡眠质量 |
| social_frequency | TINYINT | NULL | 社交频率 |
| recorded_at | DATE | NOT NULL | 记录日期 |
