CREATE TABLE IF NOT EXISTS volunteer_attendance_logs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  community_id BIGINT NOT NULL,
  volunteer_user_id BIGINT NOT NULL,
  check_in_at DATETIME NULL,
  check_out_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_volunteer_attendance_order_user (order_id, volunteer_user_id),
  KEY idx_volunteer_attendance_volunteer_created (volunteer_user_id, created_at DESC),
  KEY idx_volunteer_attendance_community_created (community_id, created_at DESC),
  CONSTRAINT fk_volunteer_attendance_order
    FOREIGN KEY (order_id) REFERENCES service_orders(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_volunteer_attendance_user
    FOREIGN KEY (volunteer_user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS volunteer_training_records (
  id BIGINT NOT NULL AUTO_INCREMENT,
  community_id BIGINT NOT NULL,
  volunteer_user_id BIGINT NOT NULL,
  training_title VARCHAR(128) NOT NULL,
  training_status ENUM('pending', 'completed', 'expired') NOT NULL DEFAULT 'pending',
  training_at DATETIME NULL,
  expires_at DATETIME NULL,
  certificate_url VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_volunteer_training_user_created (volunteer_user_id, created_at DESC),
  KEY idx_volunteer_training_community_status (community_id, training_status),
  CONSTRAINT fk_volunteer_training_user
    FOREIGN KEY (volunteer_user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
