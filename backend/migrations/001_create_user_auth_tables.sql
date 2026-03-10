-- 001-user-auth: 创建用户认证相关表

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(11) UNIQUE NULL,
  openid VARCHAR(128) UNIQUE NULL,
  nickname VARCHAR(64) NULL,
  avatar_url VARCHAR(512) NULL,
  real_name VARCHAR(64) NULL,
  age TINYINT NULL,
  gender ENUM('male', 'female', 'unknown') NOT NULL DEFAULT 'unknown',
  chronic_diseases JSON NULL,
  password_hash VARCHAR(128) NULL,
  account_status ENUM('active', 'locked', 'deleted') NOT NULL DEFAULT 'active',
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL,
  INDEX idx_users_phone (phone),
  INDEX idx_users_openid (openid),
  INDEX idx_users_status (account_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  name VARCHAR(64) NOT NULL,
  phone VARCHAR(11) NOT NULL,
  relationship VARCHAR(32) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_emergency_contacts_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_emergency_contacts_user_id (user_id),
  INDEX idx_emergency_contacts_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS family_bindings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  elder_user_id BIGINT NOT NULL,
  family_user_id BIGINT NULL,
  binding_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  qr_code VARCHAR(128) NULL,
  qr_expired_at DATETIME NULL,
  approved_at DATETIME NULL,
  rejected_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_family_bindings_elder_user_id FOREIGN KEY (elder_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_family_bindings_family_user_id FOREIGN KEY (family_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_family_bindings_elder_family (elder_user_id, family_user_id),
  INDEX idx_family_bindings_qr_code (qr_code),
  INDEX idx_family_bindings_status (binding_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sms_codes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(11) NOT NULL,
  code VARCHAR(6) NOT NULL,
  purpose ENUM('register', 'login', 'bind', 'reset_password') NOT NULL,
  used TINYINT(1) NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sms_codes_phone_purpose_created (phone, purpose, created_at),
  INDEX idx_sms_codes_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NULL,
  action VARCHAR(32) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  details JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_logs_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_logs_user_created (user_id, created_at),
  INDEX idx_audit_logs_action_created (action, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
