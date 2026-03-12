'use strict';

describe('knowledgeGraphService', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function loadService() {
    const drugInteractionModel = {
      findTopInteractionByPair: jest.fn(),
    };

    jest.doMock('../../src/models/drugInteraction', () => drugInteractionModel);
    const service = require('../../src/services/knowledgeGraphService');
    return { service, drugInteractionModel };
  }

  it('returns normalized interaction data from the model layer when available', async () => {
    const { service, drugInteractionModel } = loadService();
    drugInteractionModel.findTopInteractionByPair.mockResolvedValueOnce({
      level: 'D',
      mechanism: 'Metabolism conflict',
      risk_description: 'Raises plasma concentration.',
      suggestion: 'Adjust therapy.',
    });

    await expect(service.checkInteraction('Drug A', 'Drug B')).resolves.toEqual({
      level: 'D',
      mechanism: 'Metabolism conflict',
      riskDescription: 'Raises plasma concentration.',
      suggestion: 'Adjust therapy.',
    });
    expect(drugInteractionModel.findTopInteractionByPair).toHaveBeenCalledWith('Drug A', 'Drug B');
  });

  it('falls back to curated interaction knowledge when the model layer has no match', async () => {
    const { service, drugInteractionModel } = loadService();
    drugInteractionModel.findTopInteractionByPair.mockResolvedValueOnce(null);

    await expect(service.checkInteraction('华法林', '阿司匹林')).resolves.toEqual(
      expect.objectContaining({
        level: 'X',
        mechanism: '双重抗凝与抗血小板作用叠加',
      })
    );
  });

  it('returns contraindications for exact and normalized drug names', async () => {
    const { service } = loadService();

    await expect(service.getContraindicationsByDrug('华法林')).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ diseaseName: '活动性出血', severity: 'high' }),
      ])
    );

    await expect(service.getContraindicationsByDrug('  普萘洛尔  ')).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ diseaseName: '支气管哮喘', severity: 'high' }),
      ])
    );

    await expect(service.getContraindicationsByDrug('')).resolves.toEqual([]);
  });
});
