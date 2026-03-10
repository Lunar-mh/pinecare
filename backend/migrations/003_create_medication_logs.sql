-- 003-medication-reminder: 创建服药记录表

CREATE TABLE IF NOT EXISTS medication_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  plan_id BIGINT NOT NULL,
  scheduled_time DATETIME NOT NULL,
  actual_time DATETIME NULL,
  status ENUM('pending', 'taken', 'missed', 'skipped') NOT NULL DEFAULT 'pending',
  reminder_sent TINYINT(1) NOT NULL DEFAULT 0,
  second_reminder_sent TINYINT(1) NOT NULL DEFAULT 0,
  family_notified TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
