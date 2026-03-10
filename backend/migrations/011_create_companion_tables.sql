-- 011-ai-companion: 创建 AI 陪伴模块数据表

CREATE TABLE IF NOT EXISTS companion_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  message TEXT NOT NULL,
  reply TEXT NOT NULL,
  emotion_score INT NOT NULL,
  session_type ENUM('chat', 'game', 'nostalgia') NOT NULL DEFAULT 'chat',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_011_companion_sessions_user_created (user_id, created_at DESC),
  KEY idx_011_companion_sessions_type_created (session_type, created_at DESC),
  CONSTRAINT chk_011_companion_sessions_emotion
    CHECK (emotion_score >= 0 AND emotion_score <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  game_type ENUM('memory', 'word_chain', 'puzzle') NOT NULL,
  score INT NOT NULL,
  difficulty INT NOT NULL,
  duration_seconds INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_011_game_records_user_created (user_id, created_at DESC),
  KEY idx_011_game_records_type_created (game_type, created_at DESC),
  CONSTRAINT chk_011_game_records_score CHECK (score >= 0),
  CONSTRAINT chk_011_game_records_difficulty CHECK (difficulty >= 1 AND difficulty <= 5),
  CONSTRAINT chk_011_game_records_duration CHECK (duration_seconds >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS emotion_tracks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  track_date DATE NOT NULL,
  avg_score DECIMAL(5, 2) NOT NULL,
  record_count INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_011_emotion_tracks_user_date (user_id, track_date),
  KEY idx_011_emotion_tracks_user_date (user_id, track_date),
  CONSTRAINT chk_011_emotion_tracks_avg CHECK (avg_score >= 0 AND avg_score <= 100),
  CONSTRAINT chk_011_emotion_tracks_count CHECK (record_count >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
