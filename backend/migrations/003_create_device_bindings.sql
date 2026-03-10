-- 002-health-archive: 创建设备绑定表

CREATE TABLE IF NOT EXISTS device_bindings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  device_name VARCHAR(128) NOT NULL,
  device_mac VARCHAR(64) NOT NULL,
  device_type VARCHAR(64) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  battery_level INT NULL,
  bind_status ENUM('bound', 'unbound') NOT NULL DEFAULT 'bound',
  last_sync_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_device_bindings_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_device_bindings_user_mac (user_id, device_mac),
  INDEX idx_device_bindings_user_status (user_id, bind_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
