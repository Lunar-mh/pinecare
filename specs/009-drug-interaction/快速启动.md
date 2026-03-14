# Quickstart: 用药交互检查

## 环境准备

### 1. 安装依赖

```bash
# 后端依赖
npm install express mysql2 neo4j-driver axios dotenv

# 开发依赖
npm install -D jest supertest
```

### 2. 环境变量配置

创建 `.env` 文件：

```env
# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=yinban

# Neo4j图数据库
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
```

### 3. 数据库初始化

```sql
-- 药物相互作用记录表
CREATE TABLE drug_interactions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  drug_a VARCHAR(64) NOT NULL,
  drug_b VARCHAR(64) NOT NULL,
  interaction_level ENUM('X','D','C','B','A') NOT NULL,
  mechanism TEXT NULL,
  risk_description TEXT NULL,
  suggestion TEXT NULL,
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status ENUM('new','acknowledged','dismissed') DEFAULT 'new',
  INDEX idx_user_status (user_id, status),
  INDEX idx_drugs (drug_a, drug_b)
);

-- 药物禁忌记录表
CREATE TABLE drug_contraindications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  drug_name VARCHAR(64) NOT NULL,
  disease_code VARCHAR(32) NOT NULL,
  disease_name VARCHAR(128) NOT NULL,
  severity ENUM('high','medium','low') NOT NULL,
  description TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 药物食物相互作用表
CREATE TABLE drug_food_interactions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  drug_name VARCHAR(64) NOT NULL,
  food_name VARCHAR(64) NOT NULL,
  interaction_type VARCHAR(32) NOT NULL,
  description TEXT NULL,
  suggestion TEXT NULL,
  INDEX idx_drug (drug_name)
);
```

---

## 核心代码

### 1. 药物知识图谱服务

```javascript
// src/services/knowledgeGraphService.js
const neo4j = require('neo4j-driver');

class KnowledgeGraphService {
  constructor() {
    this.driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
    );
  }
  
  // 查询两种药物的相互作用
  async checkInteraction(drugA, drugB) {
    const session = this.driver.session();
    
    const result = await session.run(
      `MATCH (d1:Drug {name: $drugA})-[r:INTERACTS_WITH]->(d2:Drug {name: $drugB})
       RETURN r.level as level, r.mechanism as mechanism, r.description as description`,
      { drugA, drugB }
    );
    
    await session.close();
    return result.records[0];
  }
  
  // 获取某药物的所有相互作用
  async getAllInteractions(drugName) {
    const session = this.driver.session();
    
    const result = await session.run(
      `MATCH (d:Drug {name: $drugName})-[r:INTERACTS_WITH]->(other:Drug)
       RETURN other.name as drug, r.level as level, r.mechanism as mechanism`,
      { drugName }
    );
    
    await session.close();
    return result.records;
  }
}

module.exports = new KnowledgeGraphService();
```

### 2. 冲突检测服务

```javascript
// src/services/drugInteractionService.js
const knowledgeGraphService = require('./knowledgeGraphService');

class DrugInteractionService {
  // 检测多种药物的相互作用
  async checkMultipleDrugs(userId, drugList) {
    const interactions = [];
    
    // 两两检测
    for (let i = 0; i < drugList.length; i++) {
      for (let j = i + 1; j < drugList.length; j++) {
        const result = await knowledgeGraphService.checkInteraction(
          drugList[i],
          drugList[j]
        );
        
        if (result) {
          interactions.push({
            drugA: drugList[i],
            drugB: drugList[j],
            level: result.level,
            mechanism: result.mechanism,
            description: result.description
          });
        }
      }
    }
    
    // 按风险级别排序
    return interactions.sort((a, b) => {
      const levelOrder = { X: 0, D: 1, C: 2, B: 3, A: 4 };
      return levelOrder[a.level] - levelOrder[b.level];
    });
  }
}

module.exports = new DrugInteractionService();
```

---

## API接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/drug-interaction/check | 检测药物相互作用 |
| GET | /api/drug-interaction/history | 获取历史检测记录 |
| POST | /api/drug-interaction/acknowledge | 确认已知悉风险 |
| GET | /api/drug-interaction/contraindication | 检测药物禁忌 |
| GET | /api/drug-interaction/food | 药物食物相互作用 |

---

## 测试

### 接口测试示例

```bash
# 检测药物相互作用
curl -X POST http://localhost:3000/api/drug-interaction/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"drugList":["氨氯地平","布洛芬"]}'
```

---

## 常见问题

### Q: 药物名称识别失败？
A: 确保使用药品通用名，如"布洛芬"而非"芬必得"

### Q: 检测结果如何理解？
A: X级（红色）必须避免，D级（橙色）建议避免，C级（黄色）需监测
