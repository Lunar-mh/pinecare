-- 013 社区管理模块：基础表结构
-- 执行方式: mysql -u root -p yinban < migrations/001_create_community_admin_tables.sql

CREATE TABLE IF NOT EXISTS community_admins (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  community_id BIGINT NOT NULL,
  role ENUM('admin', 'leader', 'volunteer') NOT NULL DEFAULT 'admin',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_community_admin_user_community (user_id, community_id),
  KEY idx_community_admin_community_role (community_id, role),
  KEY idx_community_admin_created_at (created_at),
  CONSTRAINT fk_community_admin_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_orders (
  id BIGINT NOT NULL AUTO_INCREMENT,
  order_no VARCHAR(32) NOT NULL,
  community_id BIGINT NOT NULL,
  service_type VARCHAR(32) NOT NULL,
  elder_id BIGINT NOT NULL,
  volunteer_id BIGINT NULL,
  status ENUM('pending', 'assigned', 'processing', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  scheduled_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_service_orders_order_no (order_no),
  KEY idx_service_orders_community_status (community_id, status),
  KEY idx_service_orders_community_created (community_id, created_at DESC),
  KEY idx_service_orders_elder (elder_id),
  KEY idx_service_orders_volunteer (volunteer_id),
  CONSTRAINT fk_service_orders_elder
    FOREIGN KEY (elder_id) REFERENCES users(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_service_orders_volunteer
    FOREIGN KEY (volunteer_id) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS community_activities (
  id BIGINT NOT NULL AUTO_INCREMENT,
  community_id BIGINT NOT NULL,
  title VARCHAR(128) NOT NULL,
  content TEXT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  max_participants INT NULL,
  registered_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_community_activities_community_start (community_id, start_time DESC),
  KEY idx_community_activities_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
