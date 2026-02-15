# Quickstart: 社区管理端

## 环境准备

```bash
# 后端
npm install express mysql2 dotenv

# 前端
npm install vue@3 element-plus vue-router axios
```

## 数据库初始化

```sql
-- 社区管理员表
CREATE TABLE community_admins (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  community_id BIGINT NOT NULL,
  role ENUM('admin','leader','volunteer') DEFAULT 'admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 服务工单表
CREATE TABLE service_orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(32) UNIQUE NOT NULL,
  community_id BIGINT NOT NULL,
  service_type VARCHAR(32) NOT NULL,
  elder_id BIGINT NOT NULL,
  volunteer_id BIGINT NULL,
  status ENUM('pending','assigned','processing','completed','cancelled') DEFAULT 'pending',
  scheduled_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 社区活动表
CREATE TABLE community_activities (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  community_id BIGINT NOT NULL,
  title VARCHAR(128) NOT NULL,
  content TEXT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  max_participants INT NULL,
  registered_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/admin/volunteers | 志愿者列表 |
| POST | /api/admin/volunteers | 添加志愿者 |
| GET | /api/admin/orders | 工单列表 |
| POST | /api/admin/orders | 创建工单 |
| PUT | /api/admin/orders/:id | 更新工单 |
| GET | /api/admin/activities | 活动列表 |
| POST | /api/admin/activities | 发布活动 |
| GET | /api/admin/stats | 数据统计 |
