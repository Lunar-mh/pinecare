---
name: clean-code-standards
description: 生产级代码质量与规范审查技能。包含 Clean Code 核心原则、命名意图明确性、圈复杂度控制（<=10）、嵌套层级约束（<=3层）、防御性异常捕获、敏感数据日志脱敏，以及 ESLint/Prettier 统一规范与代码审查自检清单。
---

# 生产级代码规范与质量审查技能 (Clean Code Standards)

本技能为智能体与开发者提供业界高标准的**代码可读性、可维护性与质量自检准则**。代码应像优美散文一样清晰易读，坚决抵制晦涩、过长、深层嵌套与缺乏防御性的“面条代码”。

---

## 1. 意图显式与命名哲学 (Naming & Intent)

### 1.1 命名必须揭示意图
- **变量与常量**：说明“它存的是什么”，而非它的技术类型或临时状态。
  - 🈲 避免：`const data1 = ...; let temp = ...; const obj = ...; const flag = true;`
  - ✅ 推荐：`const activeUserList = ...; const isElderlyModeEnabled = true; const remainingSeconds = 30;`
- **函数与方法**：使用“动词 + 名词”表明明确的动作与返回值。
  - 🈲 避免：`function handle() {} function process() {} function check() {}`
  - ✅ 推荐：`function calculateDailyMedicationDosage() {} function verifySmsVerificationCode() {} function dispatchSosEmergencyAlert() {}`
- **布尔值变量**：强制使用 `is`, `has`, `should`, `can` 作为前缀：
  - ✅ `isCriticalAlert`, `hasTakenMedicine`, `canVolunteerAcceptTask`

### 1.2 避免“魔数”与硬编码字符串
所有具有特定业务含义的数字、超时时长、状态枚举必须抽取为常量对象或 Enum：
```javascript
// 🈲 严禁裸露数字
if (status === 3 && retryCount > 5) { ... }

// ✅ 抽取语义化枚举与配置常量
const SOS_ALERT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  RESOLVED: 'RESOLVED',
  CANCELLED: 'CANCELLED'
});

const MAX_SMS_RETRY_ATTEMPTS = 3;
```

---

## 2. 复杂度控制与精简函数 (Functions & Complexity)

### 2.1 铁律红线
1. **单一职责 (Single Responsibility)**：一个函数只做一件事，并把它做好。函数体行数建议控制在 **30 ~ 50 行** 以内。
2. **圈复杂度 (Cyclomatic Complexity)**：单个函数的圈复杂度 **必须 ≤ 10**。
3. **嵌套层级 (Indentation Depth)**：最大嵌套层级 **不得超过 3 层**。

### 2.2 卫语句优先（Guard Clauses）
杜绝深层阶梯式 `if-else` 嵌套，使用卫语句提前返回（Early Return）：

```javascript
// ❌ 反面模式：深度嵌套
function confirmMedication(userId, planId, confirmationTime) {
  if (userId) {
    if (planId) {
      const plan = getPlan(planId);
      if (plan) {
        if (!plan.isConfirmed) {
          // 真正核心业务逻辑挤在第 5 层
          return executeConfirm(plan, confirmationTime);
        } else {
          throw new Error('已确认服药');
        }
      } else {
        throw new Error('计划不存在');
      }
    }
  }
}

// ✅ 规范模式：卫语句提前拦截，核心流程主干平铺
function confirmMedication(userId, planId, confirmationTime) {
  if (!userId || !planId) {
    throw new ValidationError('用户ID和计划ID不能为空');
  }

  const plan = getPlan(planId);
  if (!plan) {
    throw new NotFoundError('用药计划不存在');
  }

  if (plan.isConfirmed) {
    throw new ConflictError('该计划今日已确认服药');
  }

  // 主干流程完全处于第 1 层缩进
  return executeConfirm(plan, confirmationTime);
}
```

### 2.3 查表法替代多重分支
当 `switch-case` 或 `else if` 超过 4 个分支时，强制使用策略对象（Object Lookup / Map）代替：
```javascript
const ALERT_NOTIFIER_STRATEGIES = {
  [ALERT_LEVEL.LOW]: (alert) => sendAppNotification(alert),
  [ALERT_LEVEL.MEDIUM]: (alert) => sendSmsAndAppNotification(alert),
  [ALERT_LEVEL.HIGH]: (alert) => sendAutomatedVoiceCallAndSms(alert),
  [ALERT_LEVEL.CRITICAL]: (alert) => triggerMultiChannelBroadcast(alert),
};

function dispatchAlertNotification(level, alert) {
  const strategy = ALERT_NOTIFIER_STRATEGIES[level] || ALERT_NOTIFIER_STRATEGIES[ALERT_LEVEL.LOW];
  return strategy(alert);
}
```

---

## 3. 防御性编程与异常处理 (Defensive Coding & Error Handling)

1. **绝不吞噬异常**：
   - 严禁书写空的 `catch` 块（`catch (e) {}`）。捕获异常后必须记录结构化错误日志，并按需包装后抛出或返回给上层控制器。
2. **操作空值保护**：
   - 访问对象深层嵌套属性时，必须使用可选链操作符（Optional Chaining `?.`）与空值合并操作符（Nullish Coalescing `??`）：
   ```javascript
   const elderContactPhone = user?.profile?.emergencyContact?.phone ?? '';
   ```
3. **不可变性优先 (Immutability)**：
   - 杜绝直接修改函数入参（In-place mutation）。对于数据更新，优先返回新对象/数组副本（如使用解构赋值、`map`、`filter` 等）。

---

## 4. 日志脱敏与隐私安全合规 (Log Sanitization)

生产与测试日志必须严格遵守个人信息安全规范，禁止裸露敏感个人隐私（PII）：
- **手机号**：保留前 3 后 4 位，中间 4 位打码（`138****1234`）。
- **身份证号**：保留前 6 后 4 位，其余打码（`110101********1234`）。
- **密码 / Token / Secret**：在进入日志器输出前，强制覆写为 `[REDACTED]`。

```javascript
function sanitizeLogData(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const clone = { ...payload };
  if (clone.password) clone.password = '[REDACTED]';
  if (clone.token) clone.token = '[REDACTED]';
  if (clone.idCard) clone.idCard = clone.idCard.replace(/^(\d{6})\d+(\d{4})$/, '$1********$2');
  if (clone.phone) clone.phone = clone.phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
  return clone;
}
```

---

## 5. 格式与 Lint 检查铁律 (Linting & Formatting)

- **ESLint 零警告政策**：执行 `npm run lint` 时必须满足 `--max-warnings=0`，杜绝任何未使用的变量、未声明的全局对象。
- **Prettier 统一口径**：
  - 单引号（`singleQuote: true`）
  - 缩进两空格（`tabWidth: 2`）
  - 每行字符宽度上限（`printWidth: 100` 或 `120`）
  - 尾逗号规则（`trailingComma: "es5"`）

---

## 6. 代码质量审查自检清单 (Code Review Checklist)

- [ ] **可读性**：函数与变量名能否让新人不看内部实现就猜出意图？
- [ ] **圈复杂度**：是否有超过 3 层的嵌套？是否有巨大的 `if-else` 怪物？
- [ ] **错误处理**：异步操作（Promise/async-await）是否有完备的 `try-catch` 或统一错误拦截？
- [ ] **边界测试**：是否验证了 `null`、`undefined`、空数组、超长字符串等边界场景？
- [ ] **日志合规**：打印的日志中是否有明文手机号、密码或身份证？
