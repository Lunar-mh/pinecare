# Quickstart: 家庭空间

## 环境准备

```bash
npm install express mysql2 ali-oss multer dotenv
```

## 数据库初始化

```sql
-- 语音留言表
CREATE TABLE voice_messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  from_user_id BIGINT NOT NULL,
  to_user_id BIGINT NOT NULL,
  audio_url VARCHAR(512) NOT NULL,
  duration_seconds INT NOT NULL,
  is_played TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 家庭相册表
CREATE TABLE family_albums (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  family_id BIGINT NOT NULL,
  photo_url VARCHAR(512) NOT NULL,
  description VARCHAR(256) NULL,
  taken_at DATETIME NULL,
  uploaded_by BIGINT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 孝心值记录表
CREATE TABLE family_points (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  points INT NOT NULL,
  action_type VARCHAR(32) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/family/message/send | 发送语音留言 |
| GET | /api/family/message/list | 留言列表 |
| POST | /api/family/album/upload | 上传照片 |
| GET | /api/family/album/list | 相册列表 |
| GET | /api/family/points | 孝心值查询 |
| GET | /api/family/leaderboard | 家庭排行榜 |
