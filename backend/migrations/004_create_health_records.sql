-- 002-health-archive: 创建健康记录表

CREATE TABLE IF NOT EXISTS health_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  metric_type ENUM('blood_pressure', 'heart_rate', 'blood_oxygen', 'steps', 'sleep', 'blood_sugar', 'temperature') NOT NULL,
  value VARCHAR(64) NOT NULL,
  value_high INT NULL,
  value_low INT NULL,
  source ENUM('device', 'manual') NOT NULL DEFAULT 'device',
  device_id BIGINT NULL,
  measured_at DATETIME NOT NULL,
  synced_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_health_records_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_health_records_device_id
    FOREIGN KEY (device_id) REFERENCES device_bindings(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
