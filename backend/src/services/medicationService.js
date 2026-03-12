'use strict';

const drugInteractionService = require('./drugInteractionService');
const logger = require('../utils/logger');

class MedicationService {
  async addMedication(userId, payload) {
    const drugName = String(payload && payload.drugName ? payload.drugName : '').trim();
    if (!drugName) {
      const err = new Error('drugName is required.');
      err.code = 422;
      err.statusCode = 422;
      throw err;
    }

    const currentDrugList = Array.isArray(payload.currentDrugList) ? payload.currentDrugList : [];
    const merged = [...currentDrugList, drugName];

    const checkResult = await this.triggerInteractionCheck(userId, merged);

    return {
      message: 'Medication added and interaction scan completed.',
      drugName,
      checkBatchId: checkResult.checkBatchId || null,
      riskCount: checkResult.interactionCount || 0,
      highestRiskLevel: checkResult.highestRiskLevel || null,
    };
  }

  async editMedication(userId, payload) {
    const updatedDrugList = Array.isArray(payload && payload.updatedDrugList)
      ? payload.updatedDrugList
      : [];

    const checkResult = await this.triggerInteractionCheck(userId, updatedDrugList);

    return {
      message: 'Medication updated and interaction scan refreshed.',
      checkBatchId: checkResult.checkBatchId || null,
      riskCount: checkResult.interactionCount || 0,
      highestRiskLevel: checkResult.highestRiskLevel || null,
    };
  }

  async triggerInteractionCheck(userId, drugList) {
    try {
      return await drugInteractionService.checkInteractions(userId, drugList);
    } catch (err) {
      logger.warn('medicationService', 'interaction_check_degraded', {
        userId,
        message: err.message,
      });
      return {
        checkBatchId: null,
        interactionCount: 0,
        highestRiskLevel: null,
      };
    }
  }
}

module.exports = new MedicationService();
