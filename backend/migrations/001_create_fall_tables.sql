-- 007 跌倒检测模块：基础表结构

CREATE TABLE IF NOT EXISTS fall_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  status ENUM('detecting', 'confirmed', 'cancelled', 'false_alarm') NOT NULL DEFAULT 'detecting',
  sensor_data JSON NOT NULL,
  sensitivity ENUM('high', 'medium', 'low') NOT NULL DEFAULT 'medium',
  detected_at DATETIME NOT NULL,
  cancelled_at DATETIME NULL,
  confirmed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fall_events_user_created (user_id, created_at DESC),
  KEY idx_fall_events_status_detected (status, detected_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fall_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  sensitivity ENUM('high', 'medium', 'low') NOT NULL DEFAULT 'medium',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_fall_settings_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fall_notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  contact_id BIGINT UNSIGNED NOT NULL,
  contact_type VARCHAR(32) NOT NULL,
  notify_method VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  sent_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fall_notifications_event (event_id),
  KEY idx_fall_notifications_status_created (status, created_at DESC),
  CONSTRAINT fk_fall_notifications_event
    FOREIGN KEY (event_id) REFERENCES fall_events(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
