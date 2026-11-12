# GameHub

Play **Lucky Wheel** with friends in live rooms. Demo coins only, no real money.

- Web: https://gamehub.joura.info
- API: https://api.gamehub.joura.info
- Game engine: [MiniGame Studio](https://minigame.joura.info/docs/) (embedded)

## Run locally
1. `cd backend && cp .env.example .env` and fill in the values (MongoDB Atlas URI, MiniGame key and game id, JWT secret).
2. `npm install && npm run dev` (API on :4110).
3. `cd ../frontend && cp .env.example .env.local` (set `NEXT_PUBLIC_API_URL=http://localhost:4110`), then `npm install && npm run dev` (web on :3000).

The game's **wallet mode must be "Managed by my server"** (game → Settings), otherwise coin credits are refused.

## Test
- `cd backend && npm test` (26+ tests: auth, wallet, shop concurrency, rooms, history, webhook signature)
- `cd backend && npm run typecheck`, `cd frontend && npm run typecheck && npm run build`

## Deploy
See [docs/deploy/README.md](docs/deploy/README.md).

## Docs
[plan](docs/plan.md) · [progress](docs/progress.md) · [business rules](docs/business-rules.md) · [architecture](docs/architecture.md) · [design](docs/design.md) · [API](docs/api.md)
