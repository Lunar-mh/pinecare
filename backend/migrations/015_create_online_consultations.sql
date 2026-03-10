-- 015-medical-integration: 创建在线问诊表

CREATE TABLE IF NOT EXISTS online_consultations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  doctor_id BIGINT NOT NULL,
  department VARCHAR(100) NOT NULL,
  consult_status ENUM('pending', 'active', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  session_url VARCHAR(500) NULL,
  third_party_session_id VARCHAR(100) NULL,
  started_at DATETIME NULL,
  ended_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_015_online_consultations_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_015_online_consultations_user_created (user_id, created_at),
  INDEX idx_015_online_consultations_doctor_status (doctor_id, consult_status),
  INDEX idx_015_online_consultations_third_party (third_party_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
