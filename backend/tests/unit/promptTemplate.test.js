'use strict';

const { buildSystemPrompt } = require('../../src/utils/promptTemplate');

describe('promptTemplate', () => {
  it('builds a default prompt without a health profile', () => {
    const result = buildSystemPrompt(null);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(20);
  });

  it('injects profile details into the generated prompt', () => {
    const result = buildSystemPrompt({
      age: 77,
      gender: 'male',
      chronicDiseases: ['hypertension'],
      allergies: ['penicillin'],
      currentMedications: ['amlodipine'],
      recentIndicators: {
        bloodPressure: '138/88',
        bloodSugar: '6.2',
        heartRate: '72',
      },
    });

    expect(result).toContain('77');
    expect(result).toContain('hypertension');
    expect(result).toContain('penicillin');
    expect(result).toContain('amlodipine');
    expect(result).toContain('138/88');
    expect(result).toContain('6.2');
    expect(result).toContain('72');
  });
});
