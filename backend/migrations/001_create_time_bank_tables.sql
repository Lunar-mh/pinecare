-- 时间银行模块数据表
-- 执行方式: mysql -u root -p yinban < migrations/001_create_time_bank_tables.sql

-- 时间币账户表
CREATE TABLE IF NOT EXISTS time_accounts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL UNIQUE,
  balance INT NOT NULL DEFAULT 0,
  total_earned INT NOT NULL DEFAULT 0,
  total_spent INT NOT NULL DEFAULT 0,
  credit_score INT NOT NULL DEFAULT 100,
  credit_level ENUM('new','silver','gold','angel') NOT NULL DEFAULT 'new',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CHECK (balance >= 0),
  CHECK (total_earned >= 0),
  CHECK (total_spent >= 0),
  CHECK (credit_score >= 0 AND credit_score <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 服务记录表
CREATE TABLE IF NOT EXISTS service_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  record_hash VARCHAR(64) NOT NULL UNIQUE,
  prev_hash VARCHAR(64) NOT NULL,
  provider_id BIGINT NOT NULL,
  recipient_id BIGINT NOT NULL,
  service_type VARCHAR(32) NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  duration_hours DECIMAL(3,1) NOT NULL,
  time_coins INT NOT NULL,
  location_hash VARCHAR(64) NULL,
  status ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
  provider_signature VARCHAR(256) NULL,
  recipient_signature VARCHAR(256) NULL,
  platform_signature VARCHAR(256) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (duration_hours >= 0.5 AND duration_hours <= 8.0),
  CHECK (time_coins > 0),
  INDEX idx_provider_status (provider_id, status),
  INDEX idx_recipient_status (recipient_id, status),
  INDEX idx_record_hash (record_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 兑换记录表
CREATE TABLE IF NOT EXISTS exchange_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  exchange_type ENUM('service','goods','medical','donation') NOT NULL,
  item_name VARCHAR(128) NOT NULL,
  coins_required INT NOT NULL,
  status ENUM('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  CHECK (coins_required > 0),
  INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
