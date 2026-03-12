# Competition Seed Workflow

## Why assets are generated

Competition seed JSON, SQL exports, and offline packages are generated artifacts. The repository keeps the source dataset and scripts, but does not keep exported results under Git.

## Commands

- `npm run seed:competition`: inspect the baseline dataset summary.
- `npm run seed:competition:export`: generate JSON replay assets into `backend/generated/competition-seed/`.
- `npm run seed:competition:sql`: generate bootstrap SQL into `backend/generated/competition-seed/`.
- `npm run seed:competition:package`: build a standalone offline package into `backend/generated/competition-package/`.
- `npm run seed:competition:apply`: import the generated seed into MySQL.
- `npm run seed:competition:verify`: verify expected table counts and chain checks.
- `npm run seed:competition:refresh`: snapshot, apply, and verify in one pass.

## Offline package layout

- `json/`: replay and defense reference data.
- `sql/`: bootstrap SQL and import summary.
- `package-manifest.json`: generated package metadata.
- `README.md`: package usage summary.

## Reproducibility

Run the export or package command in a fresh environment after installing backend dependencies. The generated files are reproducible from:

- `backend/src/data/competitionSeedDataset.js`
- `backend/src/data/competitionSeedSql.js`
- `backend/src/data/competitionSeedAssets.js`
- `backend/scripts/`
