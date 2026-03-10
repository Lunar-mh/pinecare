-- 014-gps-tracking: 创建围栏告警表

CREATE TABLE IF NOT EXISTS fence_alerts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  fence_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  alert_type ENUM('enter', 'exit') NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  is_handled TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fence_alerts_fence_id FOREIGN KEY (fence_id) REFERENCES geo_fences(id) ON DELETE CASCADE,
  CONSTRAINT fk_fence_alerts_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_fence_alerts_user_created (user_id, created_at),
  INDEX idx_fence_alerts_fence_created (fence_id, created_at),
  INDEX idx_fence_alerts_handled (is_handled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
