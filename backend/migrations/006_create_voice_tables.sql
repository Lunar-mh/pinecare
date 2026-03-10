-- 006-voice-interaction: 创建语音交互相关数据表

CREATE TABLE IF NOT EXISTS voice_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  session_start DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  session_end DATETIME NULL,
  round_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_voice_sessions_user_created (user_id, created_at),
  INDEX idx_voice_sessions_user_session_start (user_id, session_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS voice_command_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  user_id INT NOT NULL,
  command_type ENUM('recognize', 'synthesize') NOT NULL,
  recognized_text TEXT NULL,
  response_text TEXT NULL,
  audio_data LONGTEXT NULL,
  status ENUM('success', 'failed') NOT NULL DEFAULT 'success',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_voice_command_logs_session_id
    FOREIGN KEY (session_id) REFERENCES voice_sessions(id)
    ON DELETE CASCADE,
  INDEX idx_voice_command_logs_session_created (session_id, created_at),
  INDEX idx_voice_command_logs_user_created (user_id, created_at),
  INDEX idx_voice_command_logs_command_type (command_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
