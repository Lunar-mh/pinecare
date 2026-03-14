'use strict';

describe('hashChain normalization', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.HASH_SECRET = 'unit-test-secret';
  });

  afterAll(() => {
    delete process.env.HASH_SECRET;
  });

  it('treats numeric strings and numbers as the same value when hashing', () => {
    const { generateRecordHash } = require('../../src/utils/hashChain');

    const base = {
      prev_hash: 'prev-hash',
      provider_id: 6001,
      recipient_id: 6002,
      service_type: 'visit',
      start_time: '2026-03-14 10:00:00',
      end_time: '2026-03-14 11:00:00',
      duration_hours: 1,
      time_coins: 1,
      location_hash: null,
      status: 'pending',
    };

    const hashFromNumbers = generateRecordHash(base);
    const hashFromNumericStrings = generateRecordHash({
      ...base,
      duration_hours: '1.00',
      time_coins: '1',
      provider_id: '6001',
      recipient_id: '6002',
    });

    expect(hashFromNumericStrings).toBe(hashFromNumbers);
  });

  it('keeps non-date plain strings as strings during hashing', () => {
    const { generateRecordHash } = require('../../src/utils/hashChain');

    const hashA = generateRecordHash({
      prev_hash: '00000000000000000000000000000000',
      provider_id: 6001,
      recipient_id: 6002,
      service_type: 'escort',
      start_time: '2026-03-14 10:00:00',
      end_time: '2026-03-14 11:00:00',
      duration_hours: 1,
      time_coins: 1,
      location_hash: 'abc123',
      status: 'pending',
    });

    const hashB = generateRecordHash({
      prev_hash: '00000000000000000000000000000000',
      provider_id: 6001,
      recipient_id: 6002,
      service_type: 'escort',
      start_time: '2026-03-14 10:00:00',
      end_time: '2026-03-14 11:00:00',
      duration_hours: 1,
      time_coins: 1,
      location_hash: 'abc123 ',
      status: 'pending',
    });

    expect(hashA).toBe(hashB);
  });
});
