-- 005-family-app: 创建家属通知设置表

CREATE TABLE IF NOT EXISTS notification_settings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  health_alert_enabled TINYINT(1) NOT NULL DEFAULT 1,
  medication_reminder_enabled TINYINT(1) NOT NULL DEFAULT 1,
  sos_alert_enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_notification_settings_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_notification_settings_user_id (user_id),
  INDEX idx_notification_settings_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
