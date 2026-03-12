'use strict';

const fs = require('fs');
const path = require('path');

jest.mock('../../src/models/sensitiveRecord', () => ({
  create: jest.fn(),
}));
jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
}));

const SensitiveRecord = require('../../src/models/sensitiveRecord');
const logger = require('../../src/utils/logger');
const service = require('../../src/services/contentSafetyService');

const source = fs.readFileSync(path.resolve(__dirname, '../../src/services/contentSafetyService.js'), 'utf8');
const highRiskWord = (source.match(/HIGH_RISK_WORDS = \['([^']+)'/) || [])[1];
const mediumSection = source.split('const MEDIUM_RISK_WORDS = [')[1];
const mediumRiskWord = (mediumSection.match(/'([^']+)'/) || [])[1];

describe('contentSafetyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SensitiveRecord.create.mockResolvedValue(1);
  });

  it('blocks high risk self-harm content and records the event', async () => {
    const result = await service.check(`请帮帮我 ${highRiskWord}`, 7);
    expect(result).toMatchObject({
      safe: false,
      riskType: 'self_harm',
      riskLevel: 'high',
      triage: { allowResponse: false, needsManualFollowup: true },
    });
    expect(SensitiveRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 7, riskType: 'self_harm', riskLevel: 'high' })
    );
  });

  it('marks medium risk medical content and allows neutral text', async () => {
    await expect(service.check(`最近总是 ${mediumRiskWord}`, 9)).resolves.toMatchObject({
      safe: true,
      riskType: 'health_emergency',
      riskLevel: 'medium',
      triage: { allowResponse: true, needsManualFollowup: true },
    });

    await expect(service.check('今天天气不错', null)).resolves.toMatchObject({
      safe: true,
      riskType: null,
      matchedKeyword: null,
      triage: { needsManualFollowup: false },
    });
  });

  it('logs record failures without breaking the safety response', async () => {
    SensitiveRecord.create.mockRejectedValueOnce(new Error('db down'));

    await expect(service.check(`我现在 ${highRiskWord}`, 11)).resolves.toMatchObject({
      safe: false,
      riskType: 'self_harm',
    });
    expect(logger.error).toHaveBeenCalled();
  });
});
