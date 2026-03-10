-- 004-emergency-sos：创建 SOS 事件与通知表

CREATE TABLE IF NOT EXISTS sos_events (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  trigger_type ENUM('manual', 'auto') NOT NULL DEFAULT 'manual',
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  address VARCHAR(256) NULL,
  event_status ENUM('triggered', 'confirmed', 'resolved', 'cancelled') NOT NULL DEFAULT 'triggered',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at DATETIME NULL,
  resolved_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sos_events_user_created (user_id, created_at DESC),
  KEY idx_sos_events_status_created (event_status, created_at DESC),
  CONSTRAINT fk_sos_events_user_id
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sos_notifications (
  id BIGINT NOT NULL AUTO_INCREMENT,
  sos_event_id BIGINT NOT NULL,
  contact_id BIGINT NOT NULL,
  contact_name VARCHAR(64) NOT NULL,
  notify_type ENUM('wechat', 'sms') NOT NULL,
  notify_target VARCHAR(128) NULL,
  status ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
  retry_count INT UNSIGNED NOT NULL DEFAULT 0,
  error_message VARCHAR(255) NULL,
  sent_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sos_notifications_event (sos_event_id),
  KEY idx_sos_notifications_status_created (status, created_at DESC),
  KEY idx_sos_notifications_event_type (sos_event_id, notify_type),
  CONSTRAINT fk_sos_notifications_event_id
    FOREIGN KEY (sos_event_id) REFERENCES sos_events(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_sos_notifications_contact_id
    FOREIGN KEY (contact_id) REFERENCES emergency_contacts(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
