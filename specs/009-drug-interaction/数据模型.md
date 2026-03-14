# Data Model: 用药交互检查

## 实体定义

### 1. 药物相互作用记录 (DrugInteraction)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| user_id | BIGINT | FK -> User(id) | 用户ID |
| drug_a | VARCHAR(64) | NOT NULL | 药物A（通用名） |
| drug_b | VARCHAR(64) | NOT NULL | 药物B（通用名） |
| interaction_level | ENUM('X','D','C','B','A') | NOT NULL | 相互作用级别 |
| mechanism | TEXT | NULL | 作用机制 |
| risk_description | TEXT | NULL | 风险描述 |
| suggestion | TEXT | NULL | 处置建议 |
| detected_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 检测时间 |
| status | ENUM('new','acknowledged','dismissed') | DEFAULT 'new' | 状态 |

**Indexes**:
- INDEX(user_id, status)
- INDEX(drug_a, drug_b)

---

### 2. 药物禁忌记录 (DrugContraindication)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| user_id | BIGINT | FK -> User(id) | 用户ID |
| drug_name | VARCHAR(64) | NOT NULL | 药物名称 |
| disease_code | VARCHAR(32) | NOT NULL | 疾病编码 |
| disease_name | VARCHAR(128) | NOT NULL | 疾病名称 |
| severity | ENUM('high','medium','low') | NOT NULL | 严重程度 |
| description | TEXT | NULL | 禁忌说明 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

---

### 3. 药物食物相互作用 (DrugFoodInteraction)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | ID |
| drug_name | VARCHAR(64) | NOT NULL | 药物名称 |
| food_name | VARCHAR(64) | NOT NULL | 食物名称 |
| interaction_type | VARCHAR(32) | NOT NULL | 相互作用类型 |
| description | TEXT | NULL | 作用描述 |
| suggestion | TEXT | NULL | 建议 |

**Indexes**:
- INDEX(drug_name)

---

## 验证规则

| 字段 | 验证规则 |
|------|----------|
| drug_a/drug_b | 必须是已知药物通用名 |
| interaction_level | 必须是X/D/C/B/A之一 |
| severity | 必须是high/medium/low之一 |
