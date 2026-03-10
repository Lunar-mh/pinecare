-- 014-gps-tracking: 创建位置记录表

CREATE TABLE IF NOT EXISTS location_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  accuracy FLOAT NULL,
  location_type ENUM('gps', 'wifi', '基站') NOT NULL DEFAULT 'gps',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_location_records_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_location_records_user_created (user_id, created_at),
  INDEX idx_location_records_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
