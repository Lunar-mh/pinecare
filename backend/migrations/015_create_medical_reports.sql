-- 015-medical-integration: 创建检查报告表

CREATE TABLE IF NOT EXISTS medical_reports (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  report_no VARCHAR(100) NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  report_date DATE NOT NULL,
  report_url VARCHAR(500) NULL,
  report_data JSON NULL,
  sync_status ENUM('pending', 'synced') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_015_medical_reports_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_015_medical_reports_report_no (report_no),
  INDEX idx_015_medical_reports_user_date (user_id, report_date),
  INDEX idx_015_medical_reports_sync_status (sync_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
