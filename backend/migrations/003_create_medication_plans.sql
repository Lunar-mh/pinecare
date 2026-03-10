-- 003-medication-reminder: 创建用药计划表

CREATE TABLE IF NOT EXISTS medication_plans (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  medication_name VARCHAR(128) NOT NULL,
  dosage VARCHAR(64) NOT NULL,
  frequency ENUM('once_daily', 'twice_daily', 'three_times', 'as_needed') NOT NULL,
  remind_times JSON NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  remaining_quantity INT NULL,
  reminder_threshold INT NOT NULL DEFAULT 3,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
