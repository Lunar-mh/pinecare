'use strict';

const {
  buildExpectedTableCounts,
  buildChainChecks,
} = require('../../src/data/competitionSeedVerification');

describe('competitionSeedVerification', () => {
  it('builds deterministic expected table counts for the seed baseline', () => {
    const counts = buildExpectedTableCounts();

    expect(counts.users).toBe(89);
    expect(counts.emergency_contacts).toBe(36);
    expect(counts.medication_logs).toBe(1740);
    expect(counts.service_records).toBe(26);
    expect(counts.audit_logs).toBe(45);
  });

  it('defines one verification check for each core chain', () => {
    const checks = buildChainChecks();

    expect(checks).toHaveLength(5);
    expect(checks.map((item) => item.id)).toEqual(['A', 'B', 'C', 'D', 'E']);
    checks.forEach((item) => {
      expect(item.expectedMin).toBe(1);
      expect(item.sql).toContain('SELECT COUNT(*) AS cnt');
    });
  });
});
