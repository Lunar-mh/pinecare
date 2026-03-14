# Quickstart: AI健康顾问

## 环境准备

### 1. 安装依赖

```bash
# 后端依赖
npm install express mysql2 ioredis axios dotenv

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

# 阿里云AI
DASHSCOPE_API_KEY=your_api_key

# 内容安全
ALIYUN_ACCESS_KEY_ID=your_key
ALIYUN_ACCESS_KEY_SECRET=your_secret
```

### 3. 数据库初始化

```sql
-- 咨询记录表
CREATE TABLE consult_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  session_id VARCHAR(64) NOT NULL,
  role ENUM('user','assistant') NOT NULL,
  content TEXT NOT NULL,
  tokens INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_session (user_id, session_id),
  INDEX idx_user_time (user_id, created_at)
);

-- 健康画像表
CREATE TABLE health_profiles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL UNIQUE,
  age TINYINT NULL,
  gender ENUM('male','female') NULL,
  chronic_diseases JSON NULL,
  allergies JSON NULL,
  recent_indicators JSON NULL,
  current_medications JSON NULL,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP
);

-- 敏感内容记录表
CREATE TABLE sensitive_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  risk_type VARCHAR(32) NOT NULL,
  risk_level ENUM('low','medium','high') NOT NULL,
  handled TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_risk (user_id, risk_level)
);
```

---

## 核心代码

### 1. AI服务

```javascript
// src/services/aiService.js
const axios = require('axios');

class AIService {
  async chat(userId, message, sessionId) {
    // 获取健康上下文
    const context = await this.buildContext(userId);
    
    // 调用AI API
    const response = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      {
        model: 'qwen-turbo',
        input: {
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            ...context,
            { role: 'user', content: message }
          ]
        },
        parameters: {
          result_format: 'message'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.output.choices[0].message.content;
  }
  
  getSystemPrompt() {
    return `您是银伴平台的AI健康顾问，专门为老年人提供健康咨询服务。
请用简洁、温暖、易懂的语言回答问题。
重要提示：
1. 您的建议仅供参考，不能替代医生诊断
2. 如涉及紧急医疗情况，请建议立即就医
3. 使用中文回答
4. 语速适中，表达清晰`;
  }
  
  async buildContext(userId) {
    // 从数据库获取用户健康数据
    // 构建上下文（省略实现细节）
    return [];
  }
}

module.exports = new AIService();
```

### 2. 内容安全检查

```javascript
// src/services/contentSafetyService.js
const axios = require('axios');

class ContentSafetyService {
  async check(text) {
    // 调用阿里云内容安全API（简化版）
    const sensitiveWords = ['自杀', '自残', '杀人'];
    
    for (const word of sensitiveWords) {
      if (text.includes(word)) {
        return {
          safe: false,
          riskType: 'self_harm',
          riskLevel: 'high'
        };
      }
    }
    
    return { safe: true };
  }
}

module.exports = new ContentSafetyService();
```

---

## API接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/ai-consult/chat | 发送咨询消息 |
| GET | /api/ai-consult/history | 获取会话历史 |
| POST | /api/ai-consult/voice | 语音咨询 |
| GET | /api/ai-consult/profile | 获取健康画像 |
| PUT | /api/ai-consult/profile | 更新健康画像 |

---

## 测试

### 接口测试示例

```bash
# 发送咨询消息
curl -X POST http://localhost:3000/api/ai-consult/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"message":"我血压高怎么办","sessionId":"abc123"}'

# 获取历史记录
curl -X GET "http://localhost:3000/api/ai-consult/history?sessionId=abc123" \
  -H "Authorization: Bearer <token>"
```

---

## 常见问题

### Q: AI回答不准确？
A: 检查健康画像数据是否完整，提示词是否清晰

### Q: 语音识别失败？
A: 检查麦克风权限，确保网络连接稳定

### Q: 内容审核触发怎么办？
A: 高风险内容会自动通知家属和客服
