# Quickstart: 用户注册与身份认证

## 环境准备

### 1. 安装依赖

```bash
# 后端依赖
npm install express mysql2 ioredis jsonwebtoken bcrypt dotenv

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

# JWT
JWT_SECRET=your-256-bit-secret-key
JWT_EXPIRES_IN=7d

# 微信小程序
WX_APPID=your_appid
WX_APPSECRET=your_appsecret

# 阿里云短信
ALIYUN_ACCESS_KEY_ID=your_key
ALIYUN_ACCESS_KEY_SECRET=your_secret
ALIYUN_SMS_SIGN_NAME=银伴平台
ALIYUN_SMS_TEMPLATE_CODE=SMS_xxx
```

### 3. 数据库初始化

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS yinban CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 用户表
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(11) UNIQUE NULL,
  openid VARCHAR(128) UNIQUE NULL,
  nickname VARCHAR(64) NULL,
  avatar_url VARCHAR(512) NULL,
  real_name VARCHAR(64) NULL,
  age TINYINT NULL,
  gender ENUM('male','female','unknown') DEFAULT 'unknown',
  chronic_diseases JSON NULL,
  password_hash VARCHAR(128) NULL,
  account_status ENUM('active','locked','deleted') DEFAULT 'active',
  failed_login_attempts INT DEFAULT 0,
  locked_until DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL,
  INDEX idx_phone (phone),
  INDEX idx_openid (openid)
);

-- 紧急联系人表
CREATE TABLE emergency_contacts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  name VARCHAR(64) NOT NULL,
  phone VARCHAR(11) NOT NULL,
  relationship VARCHAR(32) NOT NULL,
  is_primary TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
);

-- 家属绑定关系表
CREATE TABLE family_bindings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  elder_user_id BIGINT NOT NULL,
  family_user_id BIGINT NOT NULL,
  binding_status ENUM('pending','approved','rejected') DEFAULT 'pending',
  qr_code VARCHAR(128) NULL,
  qr_expired_at DATETIME NULL,
  approved_at DATETIME NULL,
  rejected_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (elder_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (family_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_elder_family (elder_user_id, family_user_id)
);

-- 短信验证码表
CREATE TABLE sms_codes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(11) NOT NULL,
  code VARCHAR(6) NOT NULL,
  purpose ENUM('register','login','bind','reset_password') NOT NULL,
  used TINYINT DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_phone (phone, purpose, created_at)
);

-- 审计日志表
CREATE TABLE audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NULL,
  action VARCHAR(32) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  details JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id, created_at)
);
```

---

## 核心代码

### 1. 启动服务

```javascript
// src/index.js
require('dotenv').config();
const express = require('express');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

const app = express();

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 2. 发送验证码

```javascript
// src/services/smsService.js
const Redis = require('ioredis');
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

class SmsService {
  // 生成6位验证码
  generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // 发送验证码
  async sendCode(phone, purpose) {
    // 检查频率限制：每天每号10次
    const dailyKey = `sms:count:${phone}:${new Date().toISOString().slice(0,10)}`;
    const dailyCount = await redis.incr(dailyKey);
    if (dailyCount === 1) {
      await redis.expire(dailyKey, 86400);
    }
    if (dailyCount > 10) {
      throw new Error('超过每日发送限制');
    }

    // 生成验证码
    const code = this.generateCode();
    
    // 存入Redis，5分钟过期
    const codeKey = `sms:code:${phone}:${purpose}`;
    await redis.setex(codeKey, 300, code);

    // 调用阿里云发送短信（此处为伪代码）
    // await aliyunSms.send({ phone, code });

    return { success: true };
  }

  // 验证验证码
  async verifyCode(phone, code, purpose) {
    const codeKey = `sms:code:${phone}:${purpose}`;
    const storedCode = await redis.get(codeKey);

    if (!storedCode) {
      return { valid: false, reason: '验证码已过期' };
    }

    if (storedCode !== code) {
      return { valid: false, reason: '验证码错误' };
    }

    // 验证成功后删除
    await redis.del(codeKey);
    return { valid: true };
  }
}

module.exports = new SmsService();
```

### 3. 微信登录

```javascript
// src/services/wechatService.js
const axios = require('axios');
const jwt = require('jsonwebtoken');

class WechatService {
  async code2Session(code) {
    const response = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: process.env.WX_APPID,
        secret: process.env.WX_APPSECRET,
        js_code: code,
        grant_type: 'authorization_code'
      }
    });

    if (response.data.errcode) {
      throw new Error(`微信登录失败: ${response.data.errmsg}`);
    }

    return {
      openid: response.data.openid,
      session_key: response.data.session_key,
      unionid: response.data.unionid
    };
  }

  // 生成JWT
  generateToken(user) {
    return jwt.sign(
      { 
        userId: user.id,
        openid: user.openid,
        role: user.role || 'elder'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }
}

module.exports = new WechatService();
```

---

## API接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/send-sms | 发送验证码 |
| POST | /api/auth/register/phone | 手机号注册 |
| POST | /api/auth/login/phone | 手机号登录 |
| POST | /api/auth/login/wechat | 微信登录 |
| POST | /api/auth/refresh-token | 刷新Token |
| GET | /api/user/profile | 获取用户信息 |
| PUT | /api/user/profile | 更新用户信息 |
| GET | /api/user/emergency-contacts | 获取紧急联系人 |
| POST | /api/user/emergency-contacts | 添加紧急联系人 |
| DELETE | /api/user/emergency-contacts/:id | 删除紧急联系人 |
| POST | /api/user/binding/qrcode | 生成绑定二维码 |
| POST | /api/user/binding/approve | 同意/拒绝绑定 |
| POST | /api/user/account/delete | 注销账户 |

---

## 测试

### 运行单元测试

```bash
npm test
```

### 接口测试示例

```bash
# 发送验证码
curl -X POST http://localhost:3000/api/auth/send-sms \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","purpose":"register"}'

# 手机号注册
curl -X POST http://localhost:3000/api/auth/register/phone \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","code":"123456","password":"Password123"}'

# 微信登录
curl -X POST http://localhost:3000/api/auth/login/wechat \
  -H "Content-Type: application/json" \
  -d '{"code":"微信code"}'
```

---

## 常见问题

### Q: 验证码收不到？
A: 检查阿里云短信签名/模板是否审核通过，检查手机号格式是否正确

### Q: 微信登录失败？
A: 检查AppID和AppSecret是否正确，确保小程序AppID与服务端配置一致

### Q: 登录token过期？
A: 使用refresh_token接口刷新，或引导用户重新登录
