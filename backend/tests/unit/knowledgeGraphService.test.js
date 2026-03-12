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

    await expect(
      service.checkInteraction('\u534e\u6cd5\u6797', '\u963f\u53f8\u5339\u6797')
    ).resolves.toEqual(
      expect.objectContaining({
        level: 'X',
        mechanism: 'Dual anticoagulant and antiplatelet effects overlap.',
      })
    );
  });

  it('returns contraindications for exact and normalized drug names', async () => {
    const { service } = loadService();

    await expect(service.getContraindicationsByDrug('\u534e\u6cd5\u6797')).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ diseaseName: 'active_bleeding', severity: 'high' }),
      ])
    );

    await expect(service.getContraindicationsByDrug('  \u666e\u843d\u6d1b\u5c14  ')).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ diseaseName: 'asthma', severity: 'high' }),
      ])
    );

    await expect(service.getContraindicationsByDrug('')).resolves.toEqual([]);
  });
});
