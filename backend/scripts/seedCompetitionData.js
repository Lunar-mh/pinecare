'use strict';

const { COMPETITION_SEED_MANIFEST } = require('../src/data/competitionSeedManifest');

function main() {
  const output = {
    mode: process.env.NODE_ENV || 'development',
    manifest: COMPETITION_SEED_MANIFEST,
    nextSteps: [
      'Prepare desensitized elder/family identity rows before importing into MySQL.',
      'Import curated public medical directory first so /medical/hospitals and /medical/doctors have stable cache.',
      'Generate 30-day medication logs and GPS trail points from the manifest coverage.',
      'Backfill service_orders -> volunteer_attendance_logs -> service_records -> time_accounts in the listed order.',
      'Run admin demo bootstrap after import to verify replay evidence.',
    ],
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main();
