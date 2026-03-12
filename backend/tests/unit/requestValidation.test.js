'use strict';

const {
  optionalString,
  parseDateString,
  parseEnum,
  parseNumberInRange,
  parsePagination,
  parsePositiveInt,
  parseYmdDate,
  requireString,
} = require('../../src/utils/requestValidation');

describe('requestValidation', () => {
  it('parses positive integers and optional blanks', () => {
    expect(parsePositiveInt('12', 'userId')).toEqual({ ok: true, data: 12 });
    expect(parsePositiveInt('', 'userId', { required: false })).toEqual({ ok: true, data: null });
  });

  it('validates string requirements and max length', () => {
    expect(requireString('  abc  ', 'keyword', { maxLength: 10 })).toEqual({ ok: true, data: 'abc' });
    expect(optionalString(undefined, 'keyword')).toEqual({ ok: true, data: null });
    expect(requireString('', 'keyword')).toEqual({ ok: false, message: 'keyword is required.' });
  });

  it('validates enum, range and date formats', () => {
    expect(parseEnum('gps', 'locationType', ['gps', 'wifi'])).toEqual({ ok: true, data: 'gps' });
    expect(parseNumberInRange('12.5', 'accuracy', 0, 100)).toEqual({ ok: true, data: 12.5 });
    expect(parseDateString('2026-03-12T10:00:00.000Z', 'startDate')).toEqual({ ok: true, data: '2026-03-12T10:00:00.000Z' });
    expect(parseYmdDate('2026-03-12', 'appointmentDate')).toEqual({ ok: true, data: '2026-03-12' });
  });

  it('normalizes pagination with defaults and max page size', () => {
    expect(parsePagination({ page: '2', pageSize: '30' }, { defaultPageSize: 10 })).toEqual({
      ok: true,
      data: { page: 2, pageSize: 30 },
    });
    expect(parsePagination({}, { defaultPage: 1, defaultPageSize: 10 })).toEqual({
      ok: true,
      data: { page: 1, pageSize: 10 },
    });
    expect(parsePagination({ pageSize: '101' })).toEqual({
      ok: false,
      message: 'pageSize must be in 1-100.',
    });
  });
});
