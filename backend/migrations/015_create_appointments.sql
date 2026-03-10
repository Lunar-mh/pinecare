-- 015-medical-integration: 创建预约挂号表

CREATE TABLE IF NOT EXISTS appointments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  hospital_id BIGINT NOT NULL,
  department VARCHAR(100) NOT NULL,
  doctor_id BIGINT NOT NULL,
  appointment_date DATE NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  appoint_status ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending',
  third_party_appoint_id VARCHAR(100) NULL,
  idempotency_key VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_015_appointments_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_015_appointments_idempotency_key (idempotency_key),
  INDEX idx_015_appointments_user_created (user_id, created_at),
  INDEX idx_015_appointments_hospital_department_date (hospital_id, department, appointment_date),
  INDEX idx_015_appointments_doctor_date_slot (doctor_id, appointment_date, time_slot)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
