-- 014-gps-tracking: 创建电子围栏表

CREATE TABLE IF NOT EXISTS geo_fences (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  name VARCHAR(64) NOT NULL,
  fence_type ENUM('circle', 'polygon') NOT NULL,
  center_lat DECIMAL(10, 7) NULL,
  center_lng DECIMAL(10, 7) NULL,
  radius INT NULL,
  points JSON NULL,
  alert_type ENUM('enter', 'exit', 'both') NOT NULL DEFAULT 'both',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_geo_fences_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_geo_fences_user_active (user_id, is_active),
  INDEX idx_geo_fences_type (fence_type),
  INDEX idx_geo_fences_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
