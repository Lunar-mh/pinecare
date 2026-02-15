# Data Model: 社区管理端

## 实体定义

### 1. 社区管理员 (CommunityAdmin)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| user_id | BIGINT | FK -> User(id) | 用户ID |
| community_id | BIGINT | NOT NULL | 社区ID |
| role | ENUM('admin','leader','volunteer') | DEFAULT 'admin' | 角色 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

---

### 2. 服务工单 (ServiceOrder)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| order_no | VARCHAR(32) | UNIQUE | 工单号 |
| community_id | BIGINT | NOT NULL | 社区ID |
| service_type | VARCHAR(32) | NOT NULL | 服务类型 |
| elder_id | BIGINT | FK -> User(id) | 老人ID |
| volunteer_id | BIGINT | FK -> User(id) | 志愿者ID |
| status | ENUM('pending','assigned','processing','completed','cancelled') | DEFAULT 'pending' | 状态 |
| scheduled_at | DATETIME | NULL | 预约时间 |
| completed_at | DATETIME | NULL | 完成时间 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

---

### 3. 社区活动 (CommunityActivity)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| community_id | BIGINT | NOT NULL | 社区ID |
| title | VARCHAR(128) | NOT NULL | 标题 |
| content | TEXT | NOT NULL | 内容 |
| start_time | DATETIME | NOT NULL | 开始时间 |
| end_time | DATETIME | NOT NULL | 结束时间 |
| max_participants | INT | NULL | 最大人数 |
| registered_count | INT | DEFAULT 0 | 报名人数 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
