-- AI健康顾问模块数据表
-- 执行方式: mysql -u root -p yinban < migrations/001_create_ai_consult_tables.sql

-- 咨询记录表
CREATE TABLE IF NOT EXISTS consult_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  session_id VARCHAR(64) NOT NULL,
  role ENUM('user','assistant') NOT NULL,
  content TEXT NOT NULL,
  tokens INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_session (user_id, session_id),
  INDEX idx_user_time (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 健康画像表
CREATE TABLE IF NOT EXISTS health_profiles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL UNIQUE,
  age TINYINT NULL,
  gender ENUM('male','female') NULL,
  chronic_diseases JSON NULL,
  allergies JSON NULL,
  recent_indicators JSON NULL,
  current_medications JSON NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 敏感内容记录表
CREATE TABLE IF NOT EXISTS sensitive_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  risk_type VARCHAR(32) NOT NULL,
  risk_level ENUM('low','medium','high') NOT NULL,
  handled TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_risk (user_id, risk_level),
  INDEX idx_user_time (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
