# SilverCare Backend

## Requirements

- Node.js 18+
- MySQL 8+
- Redis 7+

## Quick Start

1. Copy `.env.example` to `.env` and fill required values.
2. Install dependencies:
   - `npm install`
3. Run migrations:
   - `npm run migrate`
4. Start service:
   - `npm run dev` (development)
   - `npm start` (production)

## Runtime Modes

- `COMPETITION_SANDBOX`: allows mock fallback for external integrations.
- `PRODUCTION_LIVE`: disables mock fallback and requires real third-party configs.

Set via:

- `RUNTIME_MODE=COMPETITION_SANDBOX|PRODUCTION_LIVE`
- or `COMPETITION_SANDBOX=1` / `PRODUCTION_LIVE=1`

## Commands

- `npm test`: run all tests with coverage
- `npm run test:unit`: unit tests only
- `npm run test:integration`: integration tests only
- `npm run lint`: lint checks
- `npm run format:check`: format checks

## API Response Standard

All APIs must return:

- `{ code, message, data }`
- Success: `code = 0`
- Error: business/http-aligned code (`400/401/403/404/409/422/429/503/504`)

## Deployment

- Docker image: `backend/Dockerfile`
- Local compose: project root `docker-compose.yml`

## Notes

- Backend routes support both `/api/v1/*` and `/*` prefixes.
- Legacy compatibility aliases are enabled for one release cycle:
  - `/timebank/*`
  - `/location/*`
  - `/companion/*`
