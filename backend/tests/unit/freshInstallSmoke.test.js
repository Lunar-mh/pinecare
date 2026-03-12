'use strict';

const { runFreshInstallSmoke } = require('../../scripts/freshInstallSmoke');

describe('fresh install smoke', () => {
  it('passes in dry-run mode when required scripts, docs, and migration metadata exist', async () => {
    const result = await runFreshInstallSmoke({ dryRun: true });

    expect(result).toMatchObject({
      dryRun: true,
      status: 'ready',
      scripts: {
        missing: [],
      },
      files: {
        missing: [],
      },
      competitionSeed: {
        status: 'ready',
      },
    });
    expect(result.files.required).toEqual(
      expect.arrayContaining([
        'docs/privacy-policy.md',
        'docs/user-agreement.md',
        'docs/medical-disclaimer.md',
        'docs/ai-usage-notice.md',
        'docs/third-party-services-and-authorizations.md',
        'docs/data-desensitization-note.md',
      ])
    );
    expect(result.migrations.total).toBeGreaterThan(0);
  });
});
