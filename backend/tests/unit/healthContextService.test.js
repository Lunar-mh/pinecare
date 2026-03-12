'use strict';

jest.mock('../../src/models/healthProfile', () => ({
  findByUserId: jest.fn(),
}));

const HealthProfile = require('../../src/models/healthProfile');
const service = require('../../src/services/healthContextService');

describe('healthContextService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty context when no profile exists', async () => {
    HealthProfile.findByUserId.mockResolvedValueOnce(null);
    await expect(service.getContextForUser(1)).resolves.toEqual({ profile: null, contextMessages: [] });
  });

  it('builds system context from profile fields', async () => {
    HealthProfile.findByUserId.mockResolvedValueOnce({
      age: 72,
      gender: 'male',
      chronicDiseases: ['hypertension'],
      allergies: ['penicillin'],
      currentMedications: ['amlodipine'],
      recentIndicators: { bloodPressure: '120/80', bloodSugar: '5.5', heartRate: 70 },
    });

    const result = await service.getContextForUser(2);
    expect(result.profile.age).toBe(72);
    expect(result.contextMessages).toHaveLength(1);
    expect(result.contextMessages[0].role).toBe('system');
    expect(result.contextMessages[0].content).toContain('72');
  });
});
