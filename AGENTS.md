# GameHub: instructions for working on this repo

Read this, `docs/plan.md`, `docs/progress.md` and `docs/business-rules.md` before editing.

## What it is
Players register (email + password), get 100 demo coins, join the Global room or player-made rooms and play
**Lucky Wheel** (a game hosted by MiniGame Studio, embedded in an iframe / WebView). History, wallet and
rankings come from MiniGame Studio's API. A fake coin shop credits coins instantly. A Flutter APK is planned in `mobile/`.

## Stack
- `frontend/` Next.js (App Router), React, strict TypeScript, Redux Toolkit + RTK Query, Tailwind CSS 4.
- `backend/` Node 22, Express, strict TypeScript (ESM, imports end in `.js`), Mongoose on MongoDB Atlas (db `gamehub`).
- Docker Compose (`compose.yaml`, project `gamehub`). Production: `https://gamehub.joura.info` (web), `https://api.gamehub.joura.info` (API).
- Feature folders: `backend/src/modules/<name>/` (router, controller, service, model, validation) and `frontend/src/features/<name>/`.

## Commands
- Backend: `cd backend && npm run dev | typecheck | test | build`
- Frontend: `cd frontend && npm run dev | typecheck | build`
- Tests need no network or real database (in-memory MongoDB + a fake game platform in `backend/tests/helpers.ts`).
- Seeded local demo without the real game: `cd backend && npx tsx tmp/dev-fake.ts` (ignored folder, recreate if missing).

## Rules to keep
- Secrets only in gitignored `.env` files. Never print or commit them. `backend/.env.example` lists the names.
- The MiniGame API key never reaches the browser or the app. The player id sent to MiniGame is always the signed-in user's id from the token, never from the request.
- Every coin movement uses a unique `reference` (idempotency). See `docs/business-rules.md`.
- Update the docs in the same change as the code. Log each session in `docs/progress.md`.
- Shared server: touch only the `gamehub` Compose project, ports 127.0.0.1:3110 / 4110 and the two gamehub nginx files.
