# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

青松安护 (PineCare，原银伴) is a four-endpoint smart elderly care platform: elder mini-program, family mini-program, community admin dashboard, and volunteer workstation - all sharing a unified backend.

## Repository Structure

```
├── backend/      # Express + MySQL + Redis API server (Node 18)
├── frontend/     # WeChat Mini Program (Taro 4 + React)
├── admin/        # Admin dashboard (Vue 3 + Vite, Node 20)
├── volunteer/    # Volunteer workstation (vanilla JS)
├── specs/        # 10 core functional module specifications with OpenAPI
└── design/       # Design system and governance docs
```

## Common Commands

### Backend (cd backend)
```bash
npm install
npm run lint                           # ESLint with --max-warnings=0
npm run format:check                   # Prettier check
npm test                               # Jest with coverage (runInBand)
npm run test:unit                      # Unit tests only
npm run test:integration               # Integration tests only
npm run test:security                  # Security test suite
npm run test:performance               # Performance tests
npm run migrate                        # Run database migrations
npm start                              # Production start
npm run dev                            # Development with nodemon
npm run smoke:fresh-install            # Fresh install smoke test
npm run seed:competition:verify -- --dry-run  # Verify competition seed
```

### Frontend Mini Program (cd frontend)
```bash
npm install
npm run typecheck                      # TypeScript check
npm run dev:weapp                      # Development with watch
npm run build:weapp                    # Production build
```

### Admin Dashboard (cd admin)
```bash
npm install
npm run dev                            # Vite dev server
npm run build                          # vue-tsc && vite build
```

### Volunteer Workstation (cd volunteer)
```bash
npm install
npm run typecheck
npm run build
```

### Docker (from root)
```bash
docker-compose up                      # Starts backend + MySQL + Redis
```

## Architecture

### Backend

- Entry: `server.js` → `src/app.js`
- Routes mounted at `/api/v1` (legacy root `/` enabled in non-production)
- System health at `/admin/system/healthcheck` and `/admin/system/evidence`
- Service layer pattern: `routes/*.js` → `controllers/*.js` → `services/*.js`
- Database: MySQL with connection pool via `src/config/database.js`
- Cache: Redis via `src/config/redis.js`
- Migrations: Sequential SQL files in `migrations/`, run with `migrations/run.js`
- Background jobs: `src/jobs/` (medication reminders, etc.)

### Frontend (Taro Mini Program)

- Uses NutUI React components (`@nutui/nutui-react-taro`)
- Tailwind CSS with weapp-tailwindcss plugin
- Pages in `src/pages/`, subpackages in `src/subpackages/`
- Services for API calls in `src/services/`
- View models in `src/view-models/` for data presentation logic

### Admin Dashboard

- Vue 3 Composition API with TypeScript
- Element Plus UI framework with ECharts for visualization
- Views organized by feature in `src/views/` (dashboard, sos, fall, gps, etc.)
- Composables in `src/composables/` for shared logic
- Router in `src/router/`

### Volunteer Workstation

- Minimal vanilla JS SPA in `src/app.js`
- No build framework - just a simple bundler script

## Environment Variables

Backend requires (see `backend/.env.example`):
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - MySQL connection
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Redis connection
- `JWT_SECRET` - JWT signing secret
- `RUNTIME_MODE` - Set to `COMPETITION_SANDBOX` or `PRODUCTION_LIVE`

Frontend/Admin API bases:
- Mini program: `TARO_APP_API_BASE_URL` (default: `http://127.0.0.1:3001/api/v1`)
- Admin: `VITE_API_BASE_URL` (default: `http://127.0.0.1:3001`)

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push/PR to main:
1. Backend: lint, format check, tests, security suite, performance audit, smoke test
2. Admin: build
3. Frontend: typecheck, build
4. Volunteer: typecheck, build
5. Docker: build image

## Feature Modules

The platform focuses on four core active business domains backed by unified APIs:
- **居家健康监测 (Health)**: `001` auth/profile, `002` health archive & device sync
- **用药提醒 (Medication)**: `003` medication plans, logs, adherence calendar & scheduled reminders
- **SOS 紧急呼救与跌倒监测 (SOS & Fall)**: `004` emergency SOS, `007` fall detection & timeline replay
- **守护互助与社区协同 (Mutual Aid & Community)**: `005` family supervision, `010`/`013` volunteer tasks & community orders, `014` GPS tracking & geofencing

## Key Flows for Demo

1. **SOS/Fall/GPS Alert → Notification → Community Handling → Admin Replay**
2. **Health Archive & Medication Plan → Reminder → Adherence Check-in → Family Overview**
3. **Volunteer Task → Accept → Check-in/out → Complete → Admin Sync**
