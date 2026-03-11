'use strict';

describe('config/db alias', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('../../src/config/database');
  });

  it('re-exports the database module', () => {
    const mockDatabase = { query: jest.fn(), pool: { end: jest.fn() } };
    jest.doMock('../../src/config/database', () => mockDatabase);

    const alias = require('../../src/config/db');

    expect(alias).toBe(mockDatabase);
  });
});
