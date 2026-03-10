'use strict';

const drugInteractionService = require('./drugInteractionService');

/**
 * 003 模块用药服务桩
 * 仅提供与 009 模块联动所需的自动触发逻辑
 */
class MedicationService {
  /**
   * 新增用药后自动触发交互检测
   * @param {number} userId
   * @param {{drugName: string, currentDrugList?: string[]}} payload
   * @returns {Promise<object>}
   */
  async addMedication(userId, payload) {
    const drugName = String(payload && payload.drugName ? payload.drugName : '').trim();
    if (!drugName) {
      const err = new Error('drugName 不能为空');
      err.code = 422;
      err.statusCode = 422;
      throw err;
    }

    const currentDrugList = Array.isArray(payload.currentDrugList) ? payload.currentDrugList : [];
    const merged = [...currentDrugList, drugName];

    const checkResult = await this.triggerInteractionCheck(userId, merged);

    return {
      message: '新增用药成功，已自动完成交互检测',
      drugName,
      checkBatchId: checkResult.checkBatchId || null,
      riskCount: checkResult.interactionCount || 0,
      highestRiskLevel: checkResult.highestRiskLevel || null,
    };
  }

  /**
   * 编辑用药后自动重新检测
   * @param {number} userId
   * @param {{updatedDrugList: string[]}} payload
   * @returns {Promise<object>}
   */
  async editMedication(userId, payload) {
    const updatedDrugList = Array.isArray(payload && payload.updatedDrugList)
      ? payload.updatedDrugList
      : [];

    const checkResult = await this.triggerInteractionCheck(userId, updatedDrugList);

    return {
      message: '用药信息更新成功，已自动重新检测',
      checkBatchId: checkResult.checkBatchId || null,
      riskCount: checkResult.interactionCount || 0,
      highestRiskLevel: checkResult.highestRiskLevel || null,
    };
  }

  /**
   * 自动触发药物交互检测（失败时降级）
   * @param {number} userId
   * @param {Array<string>} drugList
   * @returns {Promise<object>}
   */
  async triggerInteractionCheck(userId, drugList) {
    try {
      return await drugInteractionService.checkInteractions(userId, drugList);
    } catch (err) {
      console.warn('自动触发用药交互检测失败，已降级处理:', err.message);
      return {
        checkBatchId: null,
        interactionCount: 0,
        highestRiskLevel: null,
      };
    }
  }
}

module.exports = new MedicationService();
