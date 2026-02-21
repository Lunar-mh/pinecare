'use strict';

const SensitiveRecord = require('../models/sensitiveRecord');

/**
 * 内容安全检测服务
 * 两层防护:
 *   1. 本地敏感词快速过滤（低延迟）
 *   2. 记录高风险内容到 sensitive_records
 *
 * 注: 如需接入阿里云内容安全API，在 _remoteCheck() 方法中替换实现
 */

// 高风险词汇（自伤/自杀/紧急求助类）
const HIGH_RISK_WORDS = [
  '自杀', '自残', '割腕', '轻生', '不想活', '去死', '活不下去',
];

// 中风险词汇
const MEDIUM_RISK_WORDS = [
  '头晕', '胸痛', '呼吸困难', '晕倒', '昏迷',
];

class ContentSafetyService {
  /**
   * 检查文本安全性
   * @param {string} text - 待检查文本
   * @param {number} userId - 用于记录
   * @returns {Promise<{ safe: boolean, riskType: string|null, riskLevel: string|null }>}
   */
  async check(text, userId) {
    // 本地高风险词过滤
    const highRiskMatch = HIGH_RISK_WORDS.find((word) => text.includes(word));
    if (highRiskMatch) {
      if (userId) {
        await this._recordRisk(userId, text, 'self_harm', 'high');
      }
      return { safe: false, riskType: 'self_harm', riskLevel: 'high' };
    }

    // 本地中风险词过滤（记录但放行）
    const mediumRiskMatch = MEDIUM_RISK_WORDS.find((word) => text.includes(word));
    if (mediumRiskMatch) {
      if (userId) {
        await this._recordRisk(userId, text, 'health_emergency', 'medium');
      }
      // 中风险放行，允许AI提供帮助
      return { safe: true, riskType: 'health_emergency', riskLevel: 'medium' };
    }

    return { safe: true, riskType: null, riskLevel: null };
  }

  /**
   * 记录风险内容到数据库
   * @private
   */
  async _recordRisk(userId, content, riskType, riskLevel) {
    try {
      await SensitiveRecord.create({ userId, content, riskType, riskLevel });
    } catch (err) {
      // 记录失败不影响主流程
      console.error('敏感内容记录失败:', err.message);
    }
  }
}

module.exports = new ContentSafetyService();
