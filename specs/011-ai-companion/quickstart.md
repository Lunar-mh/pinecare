# Quickstart: AI陪伴

## 环境准备

同008 AI健康顾问，共享AI大模型服务。

## 数据库初始化

```sql
-- 陪伴会话记录表
CREATE TABLE companion_sessions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  session_type ENUM('chat','game','nostalgia') NOT NULL,
  emotional_state INT NULL,
  duration_minutes INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 认知游戏记录表
CREATE TABLE game_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  game_type VARCHAR(32) NOT NULL,
  score INT NOT NULL,
  difficulty TINYINT NOT NULL,
  duration_seconds INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 情绪追踪表
CREATE TABLE emotion_tracks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  emotion_score INT NOT NULL,
  sleep_quality TINYINT NULL,
  social_frequency TINYINT NULL,
  recorded_at DATE NOT NULL,
  UNIQUE KEY uk_user_date (user_id, recorded_at)
);
```

## API接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/companion/chat | 开始对话 |
| GET | /api/companion/games | 获取游戏列表 |
| POST | /api/companion/game/record | 记录游戏成绩 |
| GET | /api/companion/emotion | 获取情绪趋势 |
| GET | /api/companion/nostalgia | 怀旧内容推荐 |
