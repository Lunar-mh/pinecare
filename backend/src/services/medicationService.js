'use strict';

class MedicationService {
  async addMedication(userId, payload) {
    const drugName = String(payload && payload.drugName ? payload.drugName : '').trim();
    if (!drugName) {
      const err = new Error('drugName is required.');
      err.code = 422;
      err.statusCode = 422;
      throw err;
    }

    return {
      message: 'Medication added.',
      drugName,
      checkBatchId: null,
      riskCount: 0,
      highestRiskLevel: null,
    };
  }

  async editMedication(_userId, _payload) {
    return {
      message: 'Medication updated.',
      checkBatchId: null,
      riskCount: 0,
      highestRiskLevel: null,
    };
  }

  async triggerInteractionCheck() {
    return {
      checkBatchId: null,
      interactionCount: 0,
      highestRiskLevel: null,
    };
  }
}

module.exports = new MedicationService();
