# Quickstart: 时间银行

## 环境准备

### 1. 安装依赖

```bash
# 后端依赖
npm install express mysql2 ioredis crypto dotenv

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

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# 密钥
HASH_SECRET=your_hash_secret
PLATFORM_PRIVATE_KEY=your_private_key
```

### 3. 数据库初始化

```sql
-- 时间币账户表
CREATE TABLE time_accounts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL UNIQUE,
  balance INT DEFAULT 0,
  total_earned INT DEFAULT 0,
  total_spent INT DEFAULT 0,
  credit_score INT DEFAULT 100,
  credit_level ENUM('new','silver','gold','angel') DEFAULT 'new',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP
);

-- 服务记录表
CREATE TABLE service_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  record_hash VARCHAR(64) UNIQUE NOT NULL,
  prev_hash VARCHAR(64) NOT NULL,
  provider_id BIGINT NOT NULL,
  recipient_id BIGINT NOT NULL,
  service_type VARCHAR(32) NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  duration_hours DECIMAL(3,1) NOT NULL,
  time_coins INT NOT NULL,
  location_hash VARCHAR(64) NULL,
  status ENUM('pending','confirmed','cancelled') DEFAULT 'pending',
  provider_signature VARCHAR(256) NULL,
  recipient_signature VARCHAR(256) NULL,
  platform_signature VARCHAR(256) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_provider (provider_id, status),
  INDEX idx_recipient (recipient_id, status)
);

-- 兑换记录表
CREATE TABLE exchange_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  exchange_type ENUM('service','goods','medical','donation') NOT NULL,
  item_name VARCHAR(128) NOT NULL,
  coins_required INT NOT NULL,
  status ENUM('pending','completed','cancelled') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  INDEX idx_user (user_id, status)
);
```

---

## 核心代码

### 1. 哈希链存证服务

```javascript
// src/utils/hashChain.js
const crypto = require('crypto');

class HashChain {
  // 计算数据哈希
  calculateHash(data) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }
  
  // 生成记录哈希
  generateRecordHash(record, prevHash) {
    const data = {
      ...record,
      prevHash
    };
    return this.calculateHash(data);
  }
  
  // 验证链完整性
  verifyChain(records) {
    for (let i = 1; i < records.length; i++) {
      const currentHash = this.calculateHash({
        ...records[i],
        prevHash: records[i].prevHash
      });
      
      if (currentHash !== records[i].record_hash) {
        return false;
      }
    }
    return true;
  }
}

module.exports = new HashChain();
```

### 2. 时间银行服务

```javascript
// src/services/timeBankService.js
const hashChain = require('../utils/hashChain');
const crypto = require('crypto');

class TimeBankService {
  // 记录服务并发放时间币
  async recordService(providerId, recipientId, serviceData) {
    // 获取上一条记录哈希
    const lastRecord = await this.getLastRecord(providerId);
    const prevHash = lastRecord ? lastRecord.record_hash : '0'.repeat(64);
    
    // 生成新记录
    const record = {
      provider_id: providerId,
      recipient_id: recipientId,
      service_type: serviceData.type,
      start_time: serviceData.startTime,
      end_time: serviceData.endTime,
      duration_hours: serviceData.duration,
      time_coins: this.calculateCoins(serviceData.type, serviceData.duration)
    };
    
    // 计算哈希
    const recordHash = hashChain.generateRecordHash(record, prevHash);
    
    // 存储记录（此处省略数据库操作）
    
    // 发放时间币
    await this.issueCoins(providerId, record.time_coins);
    
    return { recordHash, timeCoins: record.time_coins };
  }
  
  calculateCoins(type, duration) {
    const weights = {
      'normal': 1,
      'professional': 1.5,
      'emergency': 2
    };
    return Math.ceil(duration * (weights[type] || 1));
  }
}

module.exports = new TimeBankService();
```

---

## API接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/time-bank/account | 获取账户信息 |
| GET | /api/time-bank/balance | 查询余额 |
| POST | /api/time-bank/service/record | 记录服务 |
| POST | /api/time-bank/service/confirm | 确认服务完成 |
| GET | /api/time-bank/service/history | 服务历史 |
| POST | /api/time-bank/exchange | 发起兑换 |
| GET | /api/time-bank/exchange/history | 兑换历史 |
| GET | /api/time-bank/leaderboard | 排行榜 |

---

## 测试

### 接口测试示例

```bash
# 查询余额
curl -X GET http://localhost:3000/api/time-bank/balance \
  -H "Authorization: Bearer <token>"

# 记录服务
curl -X POST http://localhost:3000/api/time-bank/service/record \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"recipientId":2,"type":"normal","duration":2}'
```

---

## 常见问题

### Q: 时间币有有效期吗？
A: 目前无有效期，可长期累积

### Q: 可以转让时间币吗？
A: 仅支持本人使用，不可转让

### Q: 服务纠纷如何处理？
A: 由社区管理员仲裁
