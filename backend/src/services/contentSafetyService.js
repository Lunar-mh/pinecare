'use strict';

const SensitiveRecord = require('../models/sensitiveRecord');
const logger = require('../utils/logger');
const HIGH_RISK_WORDS = ['自杀', '自残', '割腕', '轻生', '不想活', '去死', '活不下去'];
const MEDIUM_RISK_WORDS = ['头晕', '胸痛', '呼吸困难', '晕倒', '昏迷'];

function buildTriage(riskType, riskLevel) {
  if (riskType === 'self_harm' && riskLevel === 'high') {
    return {
      riskType,
      riskLevel,
      allowResponse: false,
      needsManualFollowup: true,
      recommendation:
        'Immediately encourage offline support and notify caregivers or community staff for manual follow-up.',
      responseSuffix: null,
    };
  }

  if (riskType === 'health_emergency' && riskLevel === 'medium') {
    return {
      riskType,
      riskLevel,
      allowResponse: true,
      needsManualFollowup: true,
      recommendation:
        'Provide a concise answer, but strongly suggest offline care if symptoms persist or worsen.',
      responseSuffix:
        'This conversation is supportive only. If symptoms continue, please seek in-person medical care promptly.',
    };
  }

  return {
    riskType: null,
    riskLevel: null,
    allowResponse: true,
    needsManualFollowup: false,
    recommendation: 'No additional manual follow-up is required.',
    responseSuffix: null,
  };
}

class ContentSafetyService {
  async check(text, userId) {
    const content = String(text || '').trim();

    const highRiskMatch = HIGH_RISK_WORDS.find((word) => content.includes(word));
    if (highRiskMatch) {
      if (userId) {
        await this._recordRisk(userId, content, 'self_harm', 'high');
      }

      return {
        safe: false,
        riskType: 'self_harm',
        riskLevel: 'high',
        matchedKeyword: highRiskMatch,
        triage: buildTriage('self_harm', 'high'),
      };
    }

    const mediumRiskMatch = MEDIUM_RISK_WORDS.find((word) => content.includes(word));
    if (mediumRiskMatch) {
      if (userId) {
        await this._recordRisk(userId, content, 'health_emergency', 'medium');
      }

      return {
        safe: true,
        riskType: 'health_emergency',
        riskLevel: 'medium',
        matchedKeyword: mediumRiskMatch,
        triage: buildTriage('health_emergency', 'medium'),
      };
    }

    return {
      safe: true,
      riskType: null,
      riskLevel: null,
      matchedKeyword: null,
      triage: buildTriage(null, null),
    };
  }

  async _recordRisk(userId, content, riskType, riskLevel) {
    try {
      await SensitiveRecord.create({ userId, content, riskType, riskLevel });
    } catch (err) {
      logger.error('contentSafetyService', 'record_risk_failed', { error: err.message });
    }
  }
}

module.exports = new ContentSafetyService();




