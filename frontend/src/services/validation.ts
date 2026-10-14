/**
 * 表单验证工具
 * 提供统一的前端表单验证逻辑
 */

export type ValidationRule = {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: unknown) => boolean | string
  message?: string
}

export type ValidationResult = {
  valid: boolean
  errors: Record<string, string>
}

/**
 * 手机号验证
 */
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone)
}

/**
 * 身份证号验证（简化版）
 */
export function isValidIdCard(idCard: string): boolean {
  return /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(idCard)
}

/**
 * 邮箱验证
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * 密码强度验证（至少8位，包含数字和字母）
 */
export function isValidPassword(password: string): boolean {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(password)
}

/**
 * 验证码验证（4-6位数字）
 */
export function isValidSmsCode(code: string): boolean {
  return /^\d{4,6}$/.test(code)
}

/**
 * 姓名验证（2-20个中文字符或字母）
 */
export function isValidName(name: string): boolean {
  return /^[\u4e00-\u9fa5a-zA-Z]{2,20}$/.test(name)
}

/**
 * 金额验证
 */
export function isValidAmount(amount: string | number): boolean {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return !isNaN(num) && num >= 0 && /^\d+(\.\d{1,2})?$/.test(String(amount))
}

/**
 * 日期验证（YYYY-MM-DD格式）
 */
export function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

/**
 * 时间验证（HH:mm格式）
 */
export function isValidTime(timeStr: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr)
}

/**
 * 通用表单验证器
 */
export function validateForm(
  data: Record<string, unknown>,
  rules: Record<string, ValidationRule>
): ValidationResult {
  const errors: Record<string, string> = {}

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field]
    const strValue = String(value ?? '').trim()

    // 必填验证
    if (rule.required && !strValue) {
      errors[field] = rule.message || `请填写此项`
      continue
    }

    // 如果非必填且为空，跳过其他验证
    if (!strValue && !rule.required) continue

    // 最小长度
    if (rule.minLength && strValue.length < rule.minLength) {
      errors[field] = rule.message || `至少输入${rule.minLength}个字符`
      continue
    }

    // 最大长度
    if (rule.maxLength && strValue.length > rule.maxLength) {
      errors[field] = rule.message || `最多输入${rule.maxLength}个字符`
      continue
    }

    // 正则验证
    if (rule.pattern && !rule.pattern.test(strValue)) {
      errors[field] = rule.message || `格式不正确`
      continue
    }

    // 自定义验证
    if (rule.custom) {
      const result = rule.custom(value)
      if (result !== true) {
        errors[field] = typeof result === 'string' ? result : (rule.message || `验证失败`)
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * 预定义验证规则
 */
export const VALIDATION_RULES = {
  phone: {
    required: true,
    pattern: /^1[3-9]\d{9}$/,
    message: '请输入正确的手机号',
  },
  smsCode: {
    required: true,
    pattern: /^\d{4,6}$/,
    message: '请输入4-6位验证码',
  },
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[A-Za-z])(?=.*\d)/,
    message: '密码至少8位，需包含字母和数字',
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 20,
    pattern: /^[\u4e00-\u9fa5a-zA-Z]+$/,
    message: '请输入2-20个中文或英文字符',
  },
  idCard: {
    required: true,
    pattern: /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/,
    message: '请输入正确的身份证号',
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: '请输入正确的邮箱地址',
  },
} as const

/**
 * 格式化手机号显示（隐藏中间4位）
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

/**
 * 格式化身份证号显示（隐藏中间部分）
 */
export function maskIdCard(idCard: string): string {
  if (!idCard || idCard.length < 10) return idCard
  return `${idCard.slice(0, 6)}********${idCard.slice(-4)}`
}
