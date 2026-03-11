'use strict';

describe('config/neo4j', () => {
  it('exports a no-op driver and empty query result', async () => {
    const neo4j = require('../../src/config/neo4j');

    expect(neo4j.driver).toBeNull();
    await expect(neo4j.query('MATCH (n) RETURN n')).resolves.toEqual({ records: [] });
  });
});
