'use strict';

const fs = require('fs');
const path = require('path');
const emotionService = require('../../src/services/emotionService');

const source = fs.readFileSync(path.resolve(__dirname, '../../src/services/emotionService.js'), 'utf8');
const positiveWord = (source.match(/const POSITIVE_WORDS = \[[\s\S]*?'([^']+)'/) || [])[1];
const negativeSection = source.split('const NEGATIVE_WORDS = [')[1];
const negativeWord = (negativeSection.match(/'([^']+)'/) || [])[1];

describe('emotionService', () => {
  it('normalizes score boundaries and NaN values', () => {
    expect(emotionService.normalizeScore('bad')).toBe(50);
    expect(emotionService.normalizeScore(120)).toBe(100);
    expect(emotionService.normalizeScore(-5)).toBe(0);
  });

  it('scores text using positive and negative keywords', () => {
    expect(emotionService.scoreTextEmotion(`${positiveWord} ${positiveWord}`)).toBeGreaterThan(0);
    expect(emotionService.scoreTextEmotion(`${negativeWord} ${negativeWord}`)).toBeLessThan(0);
    expect(emotionService.analyzeDialogEmotion(positiveWord, negativeWord)).toBeGreaterThanOrEqual(0);
  });

  it('calculates empty, rising, and falling trend metrics', () => {
    const empty = emotionService.calculateTrendMetrics([]);
    expect(empty).toMatchObject({ meanScore: 0, volatility: 0, totalDays: 0 });

    const rising = emotionService.calculateTrendMetrics([
      { avgScore: 20 },
      { avgScore: 30 },
      { avgScore: 55 },
      { avgScore: 70 },
    ]);
    const falling = emotionService.calculateTrendMetrics([
      { avgScore: 80 },
      { avgScore: 70 },
      { avgScore: 40 },
      { avgScore: 20 },
    ]);

    expect(rising.totalDays).toBe(4);
    expect(falling.totalDays).toBe(4);
    expect(rising.trend).not.toBe(empty.trend);
    expect(falling.trend).not.toBe(empty.trend);
    expect(rising.trend).not.toBe(falling.trend);
  });
});
