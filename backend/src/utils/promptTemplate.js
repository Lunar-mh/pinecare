'use strict';

/**
 * 系统提示词模板工具
 * 将用户健康画像数据嵌入 AI 系统提示词，附加免责声明
 */

const DISCLAIMER = `
【重要提示】
本AI健康顾问提供的建议仅供参考，不构成医疗诊断或处方意见。
如有紧急情况或严重症状，请立即拨打120或前往医院就诊。
请遵医嘱，不要自行停药或更改用药方案。`;

/**
 * 构建系统提示词
 * @param {Object|null} healthProfile - 健康画像数据（可为null）
 * @returns {string} 完整的系统提示词
 */
function buildSystemPrompt(healthProfile) {
  let profileSection = '';

  if (healthProfile) {
    const parts = [];

    if (healthProfile.age) {
      parts.push(`年龄：${healthProfile.age}岁`);
    }
    if (healthProfile.gender) {
      parts.push(`性别：${healthProfile.gender === 'male' ? '男' : '女'}`);
    }
    if (healthProfile.chronicDiseases && healthProfile.chronicDiseases.length > 0) {
      parts.push(`慢性病：${healthProfile.chronicDiseases.join('、')}`);
    }
    if (healthProfile.allergies && healthProfile.allergies.length > 0) {
      parts.push(`过敏史：${healthProfile.allergies.join('、')}`);
    }
    if (healthProfile.currentMedications && healthProfile.currentMedications.length > 0) {
      parts.push(`当前用药：${healthProfile.currentMedications.join('、')}`);
    }
    if (healthProfile.recentIndicators) {
      const indicators = healthProfile.recentIndicators;
      const indParts = [];
      if (indicators.bloodPressure) indParts.push(`血压 ${indicators.bloodPressure}`);
      if (indicators.bloodSugar) indParts.push(`血糖 ${indicators.bloodSugar}`);
      if (indicators.heartRate) indParts.push(`心率 ${indicators.heartRate}`);
      if (indParts.length > 0) {
        parts.push(`近期健康指标：${indParts.join('，')}`);
      }
    }

    if (parts.length > 0) {
      profileSection = `\n\n【用户健康信息】\n${parts.join('\n')}`;
    }
  }

  return `您是银伴平台的AI健康顾问，专门为老年人提供健康咨询服务。
请用简洁、温暖、易懂的语言回答问题，避免使用过多专业术语。
回答要有条理，重要内容分点说明，方便老年人理解。
使用中文回答。${profileSection}
${DISCLAIMER}`;
}

module.exports = { buildSystemPrompt };
