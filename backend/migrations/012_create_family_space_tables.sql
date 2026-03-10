-- 012-family-space：创建家庭空间相关数据表

CREATE TABLE IF NOT EXISTS voice_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  from_user_id BIGINT NOT NULL,
  to_user_id BIGINT NOT NULL,
  audio_url VARCHAR(500) NOT NULL,
  duration_seconds INT UNSIGNED NOT NULL,
  is_played TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_voice_messages_to_user_created (to_user_id, created_at DESC),
  KEY idx_voice_messages_from_user_created (from_user_id, created_at DESC),
  CONSTRAINT fk_voice_messages_from_user_id
    FOREIGN KEY (from_user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_voice_messages_to_user_id
    FOREIGN KEY (to_user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS family_albums (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  family_id BIGINT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  caption VARCHAR(200) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_family_albums_family_created (family_id, created_at DESC),
  KEY idx_family_albums_user_created (user_id, created_at DESC),
  CONSTRAINT fk_family_albums_user_id
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS family_points (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  family_id BIGINT NOT NULL,
  points INT NOT NULL DEFAULT 0,
  action_type VARCHAR(50) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_family_points_user_created (user_id, created_at DESC),
  KEY idx_family_points_family_created (family_id, created_at DESC),
  KEY idx_family_points_family_user (family_id, user_id),
  CONSTRAINT fk_family_points_user_id
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
