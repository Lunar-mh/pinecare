# Quickstart: 智慧用药提醒

## 环境准备

### 1. 安装依赖

```bash
# 后端依赖
npm install express mysql2 ioredis node-cron dotenv
```

### 2. 数据库初始化

```sql
-- 用药计划表
CREATE TABLE medication_plans (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  medication_name VARCHAR(128) NOT NULL,
  dosage VARCHAR(64) NOT NULL,
  frequency ENUM('once_daily','twice_daily','three_times','as_needed') NOT NULL,
  remind_times JSON NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  remaining_quantity INT NULL,
  reminder_threshold INT DEFAULT 3,
  is_active TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_active (user_id, is_active)
);

-- 服药记录表
CREATE TABLE medication_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  plan_id BIGINT NOT NULL,
  scheduled_time DATETIME NOT NULL,
  actual_time DATETIME NULL,
  status ENUM('pending','taken','missed','skipped') DEFAULT 'pending',
  reminder_sent TINYINT DEFAULT 0,
  second_reminder_sent TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES medication_plans(id) ON DELETE CASCADE,
  INDEX idx_user_time (user_id, scheduled_time),
  INDEX idx_plan_time (plan_id, scheduled_time)
);

-- 用药提醒设置表
CREATE TABLE medication_settings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL UNIQUE,
  reminder_enabled TINYINT DEFAULT 1,
  family_sync_enabled TINYINT DEFAULT 0,
  sleep_start TIME DEFAULT '22:00:00',
  sleep_end TIME DEFAULT '06:00:00',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 提醒任务队列表
CREATE TABLE reminder_queue (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  plan_id BIGINT,
  log_id BIGINT,
  remind_type ENUM('first','second','family') NOT NULL,
  scheduled_at DATETIME NOT NULL,
  sent_at DATETIME NULL,
  status ENUM('pending','sent','failed') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status_time (status, scheduled_at)
);
```

---

## 核心代码

### 1. 定时任务 - 检查并发送提醒

```javascript
// jobs/medication-reminder.js
const cron = require('node-cron');
const db = require('../models');
const wechatNotify = require('../utils/wechat-notify');

class MedicationReminderJob {
  // 每分钟执行一次
  start() {
    cron.schedule('* * * * *', async () => {
      console.log('检查用药提醒...');
      await this.checkAndSendReminders();
    });
  }

  async checkAndSendReminders() {
    // 获取当前时间
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:mm
    
    // 查询需要发送提醒的用户
    const plans = await db.MedicationPlan.findAll({
      where: { is_active: true },
      include: [{
        model: db.MedicationSettings,
        where: { reminder_enabled: true }
      }]
    });

    for (const plan of plans) {
      // 检查是否在提醒时间
      const remindTimes = JSON.parse(plan.remind_times);
      if (remindTimes.includes(currentTime)) {
        // 创建服药记录
        const log = await db.MedicationLog.create({
          user_id: plan.user_id,
          plan_id: plan.id,
          scheduled_time: now,
          status: 'pending'
        });
        
        // 发送提醒
        await this.sendReminder(plan, log);
      }
    }
  }

  async sendReminder(plan, log) {
    // 发送微信服务通知
    await wechatNotify.send({
      templateId: 'xxx',
      touser: plan.user.openid,
      data: {
        thing1: { value: plan.medication_name },
        time2: { value: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }
      }
    });

    // 更新状态
    await db.MedicationLog.update(
      { reminder_sent: true },
      { where: { id: log.id } }
    );
  }
}

module.exports = new MedicationReminderJob();
```

### 2. 二次提醒与家属通知

```javascript
// jobs/second-reminder.js
const cron = require('node-cron');

class SecondReminderJob {
  start() {
    // 每5分钟执行一次
    cron.schedule('*/5 * * * *', async () => {
      await this.checkSecondReminder();
      await this.checkFamilyNotification();
    });
  }

  // 检查30分钟未确认，发送二次提醒
  async checkSecondReminder() {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const pendingLogs = await db.MedicationLog.findAll({
      where: {
        status: 'pending',
        reminder_sent: true,
        second_reminder_sent: false,
        scheduled_time: { [db.Sequelize.Op.lte]: thirtyMinAgo }
      }
    });

    for (const log of pendingLogs) {
      await this.sendSecondReminder(log);
    }
  }

  // 检查2小时未确认，通知家属
  async checkFamilyNotification() {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const missedLogs = await db.MedicationLog.findAll({
      where: {
        status: 'pending',
        scheduled_time: { [db.Sequelize.Op.lte]: twoHoursAgo }
      },
      include: [{ model: db.User, as: 'family' }]
    });

    for (const log of missedLogs) {
      await this.notifyFamily(log);
    }
  }
}
```

### 3. 前端 - 确认服药

```javascript
// pages/medication/confirm.js
Page({
  async confirmTake(e) {
    const logId = e.currentTarget.dataset.id;
    
    await Taro.request({
      url: '/api/v1/medication/confirm',
      method: 'POST',
      header: { Authorization: `Bearer ${token}` },
      data: {
        log_id: logId,
        status: 'taken'
      }
    });

    Taro.showToast({ title: '已确认服药', icon: 'success' });
    this.fetchTodayLogs();
  }
});
```

---

## API接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/medication/plans | 获取用药计划列表 |
| POST | /api/medication/plans | 添加用药计划 |
| PUT | /api/medication/plans/:id | 修改用药计划 |
| DELETE | /api/medication/plans/:id | 删除用药计划 |
| GET | /api/medication/logs | 获取服药记录 |
| POST | /api/medication/confirm | 确认服药 |
| GET | /api/medication/history/calendar | 获取服药日历 |
| GET | /api/medication/settings | 获取提醒设置 |
| PUT | /api/medication/settings | 更新提醒设置 |

---

## 常见问题

### Q: 收不到提醒通知？
A: 检查是否已订阅消息，在"用药管家"中点击订阅

### Q: 提醒时间不准时？
A: 服务器定时任务每分钟执行，可能有最多1分钟延迟

### Q: 如何修改提醒时间？
A: 进入用药计划详情，点击"编辑"修改提醒时间
