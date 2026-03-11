'use strict';

const { COMPETITION_SEED_MANIFEST } = require('../src/data/competitionSeedManifest');
const { COMPETITION_SEED_ASSETS } = require('../src/data/competitionSeedAssets');

function main() {
  const output = {
    mode: process.env.NODE_ENV || 'development',
    manifest: COMPETITION_SEED_MANIFEST,
    commands: COMPETITION_SEED_ASSETS.commands,
    generatedAssets: {
      outputDir: COMPETITION_SEED_ASSETS.outputDir,
      files: COMPETITION_SEED_ASSETS.files,
    },
    nextSteps: [
      'Prepare desensitized elder and family identity rows before importing into MySQL if you need closer-to-real competition evidence.',
      'Run npm run seed:competition:export to generate replay-ready JSON assets for review and backup.',
      'Run npm run seed:competition:sql to generate bootstrap.sql and import it into the contest database.',
      'Import curated public medical directory first so /medical/hospitals and /medical/doctors have stable cache semantics.',
      'Run admin demo bootstrap after import to verify replay evidence and audit traces.',
    ],
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main();
