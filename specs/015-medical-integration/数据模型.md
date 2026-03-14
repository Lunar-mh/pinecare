# Data Model: 医疗资源整合

## 实体定义

### 1. 在线问诊记录 (OnlineConsultation)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| user_id | BIGINT | FK -> User(id) | 用户ID |
| doctor_id | BIGINT | NOT NULL | 医生ID |
| hospital_id | BIGINT | NOT NULL | 医院ID |
| consult_type | ENUM('text','phone','video') | NOT NULL | 问诊类型 |
| symptom_description | TEXT | NOT NULL | 症状描述 |
| diagnosis | TEXT | NULL | 诊断结果 |
| prescription_id | BIGINT | NULL | 处方ID |
| status | ENUM('pending','ongoing','completed','cancelled') | DEFAULT 'pending' | 状态 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| completed_at | DATETIME | NULL | 完成时间 |

---

### 2. 预约挂号 (Appointment)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| user_id | BIGINT | FK -> User(id) | 用户ID |
| hospital_id | BIGINT | NOT NULL | 医院ID |
| department_id | BIGINT | NOT NULL | 科室ID |
| doctor_id | BIGINT | NOT NULL | 医生ID |
| appointment_date | DATE | NOT NULL | 预约日期 |
| appointment_time | TIME | NOT NULL | 预约时间 |
| patient_name | VARCHAR(64) | NOT NULL | 就诊人姓名 |
| patient_id_no | VARCHAR(18) | NOT NULL | 就诊人身份证 |
| status | ENUM('pending','confirmed','completed','cancelled') | DEFAULT 'pending' | 状态 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

---

### 3. 检查报告 (MedicalReport)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| user_id | BIGINT | FK -> User(id) | 用户ID |
| hospital_id | BIGINT | NOT NULL | 医院ID |
| report_type | ENUM('检验','检查') | NOT NULL | 报告类型 |
| report_name | VARCHAR(128) | NOT NULL | 报告名称 |
| report_no | VARCHAR(64) | NOT NULL | 报告编号 |
| report_date | DATE | NOT NULL | 报告日期 |
| report_url | VARCHAR(512) | NULL | 报告PDF链接 |
| content | JSON | NULL | 报告内容 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
