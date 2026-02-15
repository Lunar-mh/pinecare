# Quickstart: 医疗资源整合

## 环境准备

```bash
npm install express mysql2 axios dotenv
```

## 数据库初始化

```sql
-- 在线问诊记录表
CREATE TABLE online_consultations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  doctor_id BIGINT NOT NULL,
  hospital_id BIGINT NOT NULL,
  consult_type ENUM('text','phone','video') NOT NULL,
  symptom_description TEXT NOT NULL,
  diagnosis TEXT NULL,
  prescription_id BIGINT NULL,
  status ENUM('pending','ongoing','completed','cancelled') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL
);

-- 预约挂号表
CREATE TABLE appointments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  hospital_id BIGINT NOT NULL,
  department_id BIGINT NOT NULL,
  doctor_id BIGINT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  patient_name VARCHAR(64) NOT NULL,
  patient_id_no VARCHAR(18) NOT NULL,
  status ENUM('pending','confirmed','completed','cancelled') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 检查报告表
CREATE TABLE medical_reports (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  hospital_id BIGINT NOT NULL,
  report_type ENUM('检验','检查') NOT NULL,
  report_name VARCHAR(128) NOT NULL,
  report_no VARCHAR(64) NOT NULL,
  report_date DATE NOT NULL,
  report_url VARCHAR(512) NULL,
  content JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/medical/hospitals | 医院列表 |
| GET | /api/medical/departments | 科室列表 |
| GET | /api/medical/doctors | 医生列表 |
| POST | /api/medical/consult/start | 发起问诊 |
| POST | /api/medical/consult/message | 发送消息 |
| POST | /api/medical/appointment | 预约挂号 |
| GET | /api/medical/appointments | 预约列表 |
| GET | /api/medical/reports | 报告列表 |
| GET | /api/medical/reports/:id | 报告详情 |
