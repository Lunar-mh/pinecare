'use strict';

const HealthProfile = require('../models/healthProfile');

/**
 * 健康上下文服务
 * 从 health_profiles 表查询用户健康数据，格式化为 AI 上下文消息数组
 */
class HealthContextService {
  /**
   * 获取用户健康上下文消息
   * @param {number} userId
   * @returns {Promise<{ profile: Object|null, contextMessages: Array }>}
   */
  async getContextForUser(userId) {
    const profile = await HealthProfile.findByUserId(userId);

    if (!profile) {
      return { profile: null, contextMessages: [] };
    }

    // 将健康画像格式化为辅助 system 消息，供 AI 参考
    const contextLines = [];

    if (profile.age) contextLines.push(`用户年龄：${profile.age}岁`);
    if (profile.gender) {
      contextLines.push(`性别：${profile.gender === 'male' ? '男' : '女'}`);
    }
    if (profile.chronicDiseases && profile.chronicDiseases.length > 0) {
      contextLines.push(`慢性病史：${profile.chronicDiseases.join('、')}`);
    }
    if (profile.allergies && profile.allergies.length > 0) {
      contextLines.push(`过敏史：${profile.allergies.join('、')}`);
    }
    if (profile.currentMedications && profile.currentMedications.length > 0) {
      contextLines.push(`当前用药：${profile.currentMedications.join('、')}`);
    }
    if (profile.recentIndicators) {
      const ind = profile.recentIndicators;
      const indParts = [];
      if (ind.bloodPressure) indParts.push(`血压 ${ind.bloodPressure}`);
      if (ind.bloodSugar) indParts.push(`血糖 ${ind.bloodSugar}`);
      if (ind.heartRate) indParts.push(`心率 ${ind.heartRate} 次/分`);
      if (indParts.length > 0) {
        contextLines.push(`近期健康指标：${indParts.join('，')}`);
      }
    }

    const contextMessages = contextLines.length > 0
      ? [{
          role: 'system',
          content: `[用户健康背景信息]\n${contextLines.join('\n')}`,
        }]
      : [];

    return { profile, contextMessages };
  }
}

module.exports = new HealthContextService();
