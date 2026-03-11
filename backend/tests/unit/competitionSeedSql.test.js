'use strict';

const { buildCompetitionSeedSqlBundle, toMysqlDateTime } = require('../../src/data/competitionSeedSql');

describe('competitionSeedSql', () => {
  it('builds bootstrap sql with deterministic counts and canonical table order', () => {
    const bundle = buildCompetitionSeedSqlBundle();

    expect(bundle.importOrder[0]).toBe('users');
    expect(bundle.importOrder[bundle.importOrder.length - 1]).toBe('audit_logs');
    expect(bundle.tableCounts.users).toBe(89);
    expect(bundle.tableCounts.emergency_contacts).toBe(36);
    expect(bundle.tableCounts.audit_logs).toBe(45);
    expect(bundle.tableCounts.medication_logs).toBe(1740);
    expect(bundle.sql).toContain('SET FOREIGN_KEY_CHECKS = 0;');
    expect(bundle.sql).toContain('INSERT INTO users');
    expect(bundle.sql).toContain('INSERT INTO medication_plans');
    expect(bundle.sql).toContain('INSERT INTO audit_logs');
    expect(bundle.sql).toContain("'once_daily'");
    expect(bundle.sql).not.toContain("'daily'");
  });

  it('formats ISO timestamps into MySQL datetime strings', () => {
    expect(toMysqlDateTime('2026-03-11T12:34:56Z')).toBe('2026-03-11 12:34:56');
    expect(toMysqlDateTime('2026-03-11')).toBe('2026-03-11 00:00:00');
    expect(toMysqlDateTime(null)).toBeNull();
  });
});
