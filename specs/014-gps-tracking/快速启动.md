# Quickstart: GPS定位追踪

## 环境准备

```bash
npm install express mysql2 ioredis dotenv
```

## 数据库初始化

```sql
-- 位置记录表
CREATE TABLE location_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  accuracy FLOAT NULL,
  location_type ENUM('gps','wifi','基站') DEFAULT 'gps',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_time (user_id, created_at)
);

-- 电子围栏表
CREATE TABLE geo_fences (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  name VARCHAR(64) NOT NULL,
  fence_type ENUM('circle','polygon') NOT NULL,
  center_lat DECIMAL(10,7) NULL,
  center_lng DECIMAL(10,7) NULL,
  radius INT NULL,
  alert_type ENUM('enter','exit','both') DEFAULT 'both',
  is_active TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 围栏告警表
CREATE TABLE fence_alerts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  fence_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  alert_type ENUM('enter','exit') NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  is_handled TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/location/upload | 上传位置 |
| GET | /api/location/current | 获取当前位置 |
| GET | /api/location/trail | 获取轨迹 |
| POST | /api/location/fence | 创建围栏 |
| GET | /api/location/fences | 围栏列表 |
| DELETE | /api/location/fences/:id | 删除围栏 |
| GET | /api/location/alerts | 告警列表 |
